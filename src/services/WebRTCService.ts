/* External dependencies */
import _ from 'lodash'

/* Internal dependencies */
import * as groundAction from 'modules/reducers/groundReducer'
import ReduxStore from 'modules/reduxStore'
import SocketService from 'services/SocketService'
import DataChannelState from 'constants/DataChannelState'
import SocketEvent from 'constants/SocketEvent'
import { Warn, Error } from 'utils/consoleUtils'

interface ConstraintsType {
  video?: boolean
  audio?: boolean
}

interface PeerType {
  remoteId: string
  peerConnection: RTCPeerConnection
  useDataChannel: boolean
  dataHandler: (value: string) => void
}

interface InitOption {
  useDataChannel?: boolean
  dataHandler?: (value: string) => void
}

class Peer {
  remoteId: string
  remoteStream: MediaStream | null
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
  sendChannel: RTCDataChannel | null
  receiveChannel: RTCDataChannel | null
  useDataChannel: boolean
  dataHandler: (value: string) => void

  constructor({
    remoteId,
    peerConnection,
    useDataChannel = false,
    dataHandler = _.noop,
  }: PeerType) {
    this.remoteId = remoteId
    this.remoteStream = null
    this.senders = []
    this.peerConnection = peerConnection
    this.sendChannel = null
    this.receiveChannel = null
    this.useDataChannel = useDataChannel
    this.dataHandler = dataHandler

    if (useDataChannel) {
      this.createDataChannel()
    }
  }

  createDataChannel() {
    this.sendChannel = this.peerConnection.createDataChannel(
      this.getChannelName(this.remoteId),
    )
    this.peerConnection.ondatachannel = this.connectReceiveChannel.bind(this)
  }

  connectReceiveChannel(event: RTCDataChannelEvent) {
    this.receiveChannel = event.channel
    this.receiveChannel.onmessage = this.receiveData.bind(this)
  }

  receiveData(event: MessageEvent) {
    this.dataHandler(event.data)
  }

  getChannelName(remoteId: string) {
    return `channel-${remoteId}`
  }

  sendData(value: string) {
    if (
      !_.isNil(this.sendChannel) &&
      this.sendChannel.readyState === DataChannelState.Open
    ) {
      this.sendChannel.send(value)
    }
  }

  clear() {
    this.sendChannel?.close()
    this.receiveChannel?.close()
    this.senders.forEach(sender => {
      this.peerConnection.removeTrack(sender)
    })
    this.peerConnection.close()
  }
}

class WebRTC {
  localStream: MediaStream | null = null
  peers: Peer[] = []
  useDataChannel: boolean = false
  dataHandler: (value: string) => void = _.noop

  init({ useDataChannel = false, dataHandler = _.noop }: InitOption) {
    SocketService.on(SocketEvent.Enter, this.enterRemotePeer.bind(this))
    SocketService.on(SocketEvent.Leave, this.leaveRemotePeer.bind(this))
    SocketService.on(SocketEvent.Offer, this.waitOffer.bind(this))
    SocketService.on(SocketEvent.Answer, this.waitAnswer.bind(this))
    SocketService.on(
      SocketEvent.IceCandidate,
      this.waitRemoteIceCandidate.bind(this),
    )

    this.useDataChannel = useDataChannel
    this.dataHandler = dataHandler
  }

  enter(roomId: string) {
    SocketService.emit(SocketEvent.Enter, roomId)
  }

  leave(roomId: string) {
    SocketService.emit(SocketEvent.Leave, roomId)
  }

  /* peer connection utils */
  createPeerConnection(remoteId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection()
    const peer: Peer = new Peer({
      remoteId,
      peerConnection,
      useDataChannel: this.useDataChannel,
      dataHandler: this.dataHandler,
    })

    this.peers.push(peer)
    this.waitRemoteStream(remoteId, peerConnection)
    this.waitLocalIceCandidate(remoteId, peerConnection)

    const { localStream } = this

    if (!_.isNil(localStream)) {
      for (const track of localStream.getTracks()) {
        const sender = peerConnection.addTrack(track, localStream)
        peer.senders.push(sender)
      }
    }

    return peerConnection
  }

  async getLocalMediaStream(constraints: ConstraintsType) {
    try {
      if (!_.isNil(this.localStream)) return this.localStream

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.localStream = mediaStream
      return mediaStream
    } catch (error) {
      throw error
    }
  }

  async enterRemotePeer(remoteId: string) {
    const peerConnection = this.createPeerConnection(remoteId)

    try {
      const localSessionDescription = await peerConnection.createOffer()
      peerConnection.setLocalDescription(localSessionDescription)

      SocketService.emit(SocketEvent.Offer, remoteId, localSessionDescription)
    } catch (error) {
      Error(error)
    }
  }

  leaveRemotePeer(remoteId: string) {
    const peerIndex = this.peers.findIndex(peer => peer.remoteId === remoteId)
    if (peerIndex >= 0) {
      this.peers.splice(peerIndex, 1)
    }
    this.dispatch(groundAction.deletePeerConnection({ remoteId }))
  }

  async waitOffer(
    remoteId: string,
    remoteSessionDescription: RTCSessionDescriptionInit,
  ) {
    const peerConnection = this.createPeerConnection(remoteId)

    peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteSessionDescription),
    )

    try {
      const localSessionDescription = await peerConnection.createAnswer()
      peerConnection.setLocalDescription(localSessionDescription)

      SocketService.emit(SocketEvent.Answer, remoteId, localSessionDescription)
    } catch (error) {
      Error(error)
    }
  }

  waitAnswer(
    remoteId: string,
    remoteSessionDescription: RTCSessionDescriptionInit,
  ) {
    const peer = this.getPeer(remoteId)

    if (!_.isNil(peer)) {
      const { peerConnection } = peer
      peerConnection.setRemoteDescription(
        new RTCSessionDescription(remoteSessionDescription),
      )
    }
  }

  waitRemoteStream(remoteId: string, peerConnection: RTCPeerConnection) {
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      const remoteStream = event.streams[0]
      const peer = this.getPeer(remoteId)

      if (!_.isNil(peer)) {
        _.set(peer, 'remoteStream', remoteStream)
        this.dispatch(
          groundAction.createPeerConnection({
            remoteId,
            remoteStream,
            peerConnection,
          }),
        )
      }
    }
  }

  waitLocalIceCandidate(remoteId: string, peerConnection: RTCPeerConnection) {
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      const { candidate: iceCandidate } = event

      if (!_.isNil(iceCandidate)) {
        SocketService.emit(SocketEvent.IceCandidate, remoteId, iceCandidate)
      }
    }
  }

  waitRemoteIceCandidate(remoteId: string, iceCandidate: RTCIceCandidate) {
    const candidate = new RTCIceCandidate(iceCandidate)
    const peer = this.getPeer(remoteId)

    if (!_.isNil(peer)) {
      peer.peerConnection.addIceCandidate(candidate)
    }
  }

  getPeer(remoteId: string): Peer | undefined {
    return this.peers.find(peer => peer.remoteId === remoteId)
  }

  /* data channel utils */
  sendData(value: string) {
    if (!this.useDataChannel) {
      return Warn(
        `Cannot send data because data channel is not available. 
        Give the 'useDataChannel' prop as option of WebRTCService's init function`,
      )
    }

    this.peers.forEach(peer => {
      peer.sendData(value)
    })
  }

  /* local stream utils */
  setVideo(enabled: boolean): boolean {
    if (_.isNil(this.localStream)) {
      Error('No local video available.')
      return false
    }
    const videoTracks: MediaStreamTrack[] = this.localStream.getVideoTracks()

    if (_.isEmpty(videoTracks)) {
      Error('No local video available.')
      return false
    }

    for (let i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = enabled
    }
    return true
  }

  setAudio(enabled: boolean): boolean {
    if (_.isNil(this.localStream)) {
      Error('No local audio available.')
      return false
    }
    const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks()

    if (_.isEmpty(audioTracks)) {
      Error('No local audio available.')
      return false
    }

    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = enabled
    }
    return true
  }

  clear() {
    SocketService.off(SocketEvent.Enter)
    SocketService.off(SocketEvent.Leave)
    SocketService.off(SocketEvent.Offer)
    SocketService.off(SocketEvent.Answer)
    SocketService.off(SocketEvent.IceCandidate)

    this.localStream?.getTracks().forEach(track => track.stop())
    this.localStream = null

    this.peers.forEach(peer => peer.clear())
    this.peers = []
  }

  /* dispatch action in redux */
  dispatch(action) {
    ReduxStore.dispatch(action)
  }
}

export default new WebRTC()
