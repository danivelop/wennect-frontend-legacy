/* External dependencies */
import _ from 'lodash'

/* Internal dependencies */
import * as groundAction from 'modules/reducers/groundReducer'
import ReduxStore from 'modules/reduxStore'
import SocketService from 'services/SocketService'
import DataChannelState from 'constants/DataChannelState'
import SocketEvent from 'constants/SocketEvent'
import { Warn, Error } from 'utils/consoleUtils'

declare global {
  interface Window {
    webkitAudioContext: AudioContext
  }
}

interface ConstraintsType {
  video?: boolean
  audio?: boolean
}

interface PeerType {
  remoteId: string
  peerConnection: RTCPeerConnection
  useDataChannel: boolean
  useSoundMeter: boolean
  dataHandler: (remoteId: string, value: string) => void
  soundHandler: (remoteId: string, instant: number) => void
}

interface InitOption {
  useDataChannel?: boolean
  useSoundMeter?: boolean
  dataHandler?: (remoteId: string, value: string) => void
  soundHandler?: (remoteId: string, instant: number) => void
}

class Peer {
  remoteId: string
  remoteStream: MediaStream | null
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
  sendChannel: RTCDataChannel | null
  receiveChannel: RTCDataChannel | null
  audioContext: AudioContext | null
  script: ScriptProcessorNode | null

  /* peer option */
  useDataChannel: boolean
  useSoundMeter: boolean
  dataHandler: (remoteId: string, value: string) => void
  soundHandler: (remoteId: string, instant: number) => void

  constructor({
    remoteId,
    peerConnection,
    useDataChannel = false,
    useSoundMeter = false,
    dataHandler = _.noop,
    soundHandler = _.noop,
  }: PeerType) {
    this.remoteId = remoteId
    this.remoteStream = null
    this.senders = []
    this.peerConnection = peerConnection
    this.sendChannel = null
    this.receiveChannel = null
    this.audioContext = null
    this.script = null

    this.useDataChannel = useDataChannel
    this.useSoundMeter = useSoundMeter
    this.dataHandler = dataHandler
    this.soundHandler = soundHandler

    if (useDataChannel) {
      this.createDataChannel()
    }

    if (useSoundMeter) {
      this.createAudioContext()
    }
  }

  /* data channel utils */
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
    if (_.isFunction(this.dataHandler)) {
      this.dataHandler(this.remoteId, event.data)
    }
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

  /* sound meter utils */
  createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    this.audioContext = new AudioContext()
    this.script = this.audioContext.createScriptProcessor(2048, 1, 1)
    this.script.onaudioprocess = _.throttle(
      this.connectAudioProcess.bind(this),
      200,
    )
  }

  connectToSource(remoteStream: MediaStream) {
    if (!_.isNil(this.audioContext) && !_.isNil(this.script)) {
      const mic = this.audioContext.createMediaStreamSource(remoteStream)
      mic.connect(this.script)
      this.script.connect(this.audioContext.destination)
    }
  }

  connectAudioProcess(event: AudioProcessingEvent) {
    const input = event.inputBuffer.getChannelData(0)
    let sum = 0
    for (let i = 0; i < input.length; ++i) {
      sum += input[i] * input[i]
    }
    const instant = Math.sqrt(sum / input.length)

    if (_.isFunction(this.soundHandler)) {
      this.soundHandler(this.remoteId, parseFloat(instant.toFixed(2)))
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
  useSoundMeter: boolean = false
  dataHandler: (remoteId: string, value: string) => void = _.noop
  soundHandler: (remoteId: string, instant: number) => void = _.noop

  init({
    useDataChannel = false,
    useSoundMeter = false,
    dataHandler = _.noop,
    soundHandler = _.noop,
  }: InitOption) {
    SocketService.on(SocketEvent.Enter, this.enterRemotePeer.bind(this))
    SocketService.on(SocketEvent.Leave, this.leaveRemotePeer.bind(this))
    SocketService.on(SocketEvent.Offer, this.waitOffer.bind(this))
    SocketService.on(SocketEvent.Answer, this.waitAnswer.bind(this))
    SocketService.on(
      SocketEvent.IceCandidate,
      this.waitRemoteIceCandidate.bind(this),
    )

    this.useDataChannel = useDataChannel
    this.useSoundMeter = useSoundMeter
    this.dataHandler = dataHandler
    this.soundHandler = soundHandler
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
      useSoundMeter: this.useSoundMeter,
      dataHandler: this.dataHandler,
      soundHandler: this.soundHandler,
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

        if (this.useSoundMeter) {
          peer.connectToSource(remoteStream)
        }

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
