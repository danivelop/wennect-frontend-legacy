/* External dependencies */
import _ from 'lodash'

/* Internal dependencies */
import * as groundAction from 'modules/reducers/groundReducer'
import ReduxStore from 'modules/reduxStore'
import SocketService from 'services/SocketService'
import DataChannelState from 'constants/DataChannelState'
import SocketEvent from 'constants/SocketEvent'
import { Error } from 'utils/consoleUtils'

interface ConstraintsType {
  video?: boolean
  audio?: boolean
}

interface Peer {
  remoteId: string
  remoteStream?: MediaStream
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
  sendChannel: RTCDataChannel
}

class WebRTC {
  localStream: MediaStream | null = null
  peers: Peer[] = []
  dataHandler: (value: string) => void = _.noop

  init(dataHandler: (value: string) => void = _.noop) {
    SocketService.on(SocketEvent.Enter, this.enterRemotePeer.bind(this))
    SocketService.on(SocketEvent.Leave, this.leaveRemotePeer.bind(this))
    SocketService.on(SocketEvent.Offer, this.waitOffer.bind(this))
    SocketService.on(SocketEvent.Answer, this.waitAnswer.bind(this))
    SocketService.on(
      SocketEvent.IceCandidate,
      this.waitRemoteIceCandidate.bind(this),
    )

    this.dataHandler = dataHandler
  }

  enter(roomId: string) {
    SocketService.emit(SocketEvent.Enter, roomId)
  }

  leave(roomId: string) {
    SocketService.emit(SocketEvent.Leave, roomId)
  }

  /* peerconnection utils */
  createPeerConnection(remoteId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection()
    const sendChannel = peerConnection.createDataChannel(
      this.getChannelName(remoteId),
    )
    const peer: Peer = { remoteId, senders: [], peerConnection, sendChannel }

    this.peers.push(peer)
    this.waitRemoteStream(remoteId, peerConnection)
    this.waitLocalIceCandidate(remoteId, peerConnection)

    peerConnection.ondatachannel = this.receiveChannel.bind(this)

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
    return this.peers.find(pc => pc.remoteId === remoteId)
  }

  /* data channel utils */
  sendData(value: any) {
    this.peers.forEach(peer => {
      const { sendChannel } = peer
      if (
        !_.isNil(sendChannel) &&
        sendChannel.readyState === DataChannelState.Open
      ) {
        peer.sendChannel.send(value)
      }
    })
  }

  receiveChannel(event: RTCDataChannelEvent) {
    event.channel.onmessage = this.receiveData.bind(this)
  }

  receiveData(event: MessageEvent) {
    this.dataHandler(event.data)
  }

  getChannelName(remoteId: string) {
    return `channel-${remoteId}`
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

  hangUp() {
    SocketService.off(SocketEvent.Enter)
    SocketService.off(SocketEvent.Leave)
    SocketService.off(SocketEvent.Offer)
    SocketService.off(SocketEvent.Answer)
    SocketService.off(SocketEvent.IceCandidate)

    this.localStream?.getTracks().forEach(track => track.stop())
    this.localStream = null

    this.peers.forEach(pc => {
      pc.senders.forEach(sender => {
        pc.peerConnection.removeTrack(sender)
      })
      pc.peerConnection.close()
    })
    this.peers = []
  }

  /* dispatch action in redux */
  dispatch(action) {
    ReduxStore.dispatch(action)
  }
}

export default new WebRTC()
