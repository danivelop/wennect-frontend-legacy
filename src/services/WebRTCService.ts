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

  interface MediaDevices {
    getDisplayMedia(
      constraints: Pick<MediaStreamConstraints, 'video'>,
    ): Promise<MediaStream>
  }
}

interface PeerType {
  remoteId: string
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
  useDataChannel: boolean
  useSoundMeter: boolean
  dataHandler: (remoteId: string, value: string) => void
  soundHandler: (remoteId: string, instant: number) => void
}

interface InitOption {
  localVideoElement: HTMLVideoElement
  useDataChannel?: boolean
  useSoundMeter?: boolean
  dataHandler?: (remoteId: string, value: string) => void
  soundHandler?: (remoteId: string, instant: number) => void
}

interface CustomVideoElement extends HTMLVideoElement {
  setSinkId?(sinkId: string): Promise<void>
}

class Peer {
  remoteId: string
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
  remoteStream?: MediaStream
  sendChannel?: RTCDataChannel
  receiveChannel?: RTCDataChannel
  audioContext: AudioContext
  script?: ScriptProcessorNode
  mediaStreamSource?: MediaStreamAudioSourceNode
  mediaStreamDestination: MediaStreamAudioDestinationNode
  gainNode: GainNode

  /* peer option */
  useDataChannel: boolean
  useSoundMeter: boolean
  dataHandler: (remoteId: string, value: string) => void
  soundHandler: (remoteId: string, instant: number) => void

  constructor({
    remoteId,
    senders,
    peerConnection,
    useDataChannel = false,
    useSoundMeter = false,
    dataHandler = _.noop,
    soundHandler = _.noop,
  }: PeerType) {
    this.remoteId = remoteId
    this.senders = senders
    this.peerConnection = peerConnection

    this.useDataChannel = useDataChannel
    this.useSoundMeter = useSoundMeter
    this.dataHandler = dataHandler
    this.soundHandler = soundHandler

    this.peerConnection.ontrack = this.receiveRemoteStream.bind(this)
    this.peerConnection.onicecandidate = this.receiveLocalIceCandidate.bind(
      this,
    )

    const AudioContext = window.AudioContext || window.webkitAudioContext
    this.audioContext = new AudioContext()
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination()
    this.gainNode = this.audioContext.createGain()

    if (useDataChannel) {
      this.createDataChannel()
    }

    if (useSoundMeter) {
      this.createScript()
    }
  }

  /* peer connection utils */
  receiveRemoteStream(event: RTCTrackEvent) {
    if (!_.isNil(this.remoteStream)) {
      this.remoteStream.addTrack(event.track)

      if (event.track.kind === 'audio') {
        this.connectToSource(this.remoteStream)
      }

      return
    }

    this.remoteStream = event.streams[0]
    const { remoteId, remoteStream, peerConnection } = this

    if (event.track.kind === 'audio') {
      this.connectToSource(this.remoteStream)
    }

    this.dispatch(
      groundAction.createPeerConnection({
        remoteId,
        remoteStream,
        peerConnection,
      }),
    )
  }

  receiveLocalIceCandidate(event: RTCPeerConnectionIceEvent) {
    const { candidate: iceCandidate } = event

    if (!_.isNil(iceCandidate)) {
      SocketService.emit(SocketEvent.IceCandidate, this.remoteId, iceCandidate)
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

  sendData(value: string) {
    if (
      !_.isNil(this.sendChannel) &&
      this.sendChannel.readyState === DataChannelState.Open
    ) {
      this.sendChannel.send(value)
    }
  }

  getChannelName(remoteId: string) {
    return `channel-${remoteId}`
  }

  /* sound utils */
  createScript() {
    this.script = this.audioContext.createScriptProcessor(2048, 1, 1)
    this.script.onaudioprocess = _.throttle(
      this.connectAudioProcess.bind(this),
      200,
    )
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

  connectToSource(remoteStream: MediaStream) {
    try {
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(
        remoteStream,
      )
      this.mediaStreamSource.connect(this.gainNode)
      this.gainNode.connect(this.mediaStreamDestination)

      if (this.useSoundMeter && !_.isNil(this.script)) {
        this.mediaStreamSource.connect(this.script)
        this.script.connect(this.audioContext.destination)
      }
    } catch (error) {
      Error(error)
    }
  }

  setVolume(value: number) {
    this.gainNode.gain.value = value
  }

  /* clear func */
  clear() {
    this.senders.forEach(sender => {
      this.peerConnection.removeTrack(sender)
    })
    this.peerConnection.close()
    this.remoteStream?.getTracks().forEach(track => track.stop())

    this.sendChannel?.close()
    this.receiveChannel?.close()
    this.mediaStreamSource?.disconnect()
    this.script?.disconnect()
  }

  /* dispatch action in redux */
  dispatch(action) {
    ReduxStore.dispatch(action)
  }
}

class WebRTC {
  localStream: MediaStream | null = null
  localVideoElement: HTMLVideoElement | null = null
  peers: Peer[] = []
  useDataChannel: boolean = false
  useSoundMeter: boolean = false
  dataHandler: (remoteId: string, value: string) => void = _.noop
  soundHandler: (remoteId: string, instant: number) => void = _.noop

  init({
    localVideoElement,
    useDataChannel = false,
    useSoundMeter = false,
    dataHandler = _.noop,
    soundHandler = _.noop,
  }: InitOption) {
    SocketService.on(SocketEvent.Enter, this.enterRemotePeer.bind(this))
    SocketService.on(SocketEvent.Leave, this.leaveRemotePeer.bind(this))
    SocketService.on(SocketEvent.Offer, this.receiveOffer.bind(this))
    SocketService.on(SocketEvent.Answer, this.receiveAnswer.bind(this))
    SocketService.on(
      SocketEvent.IceCandidate,
      this.receiveRemoteIceCandidate.bind(this),
    )

    this.localVideoElement = localVideoElement
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
    const senders: RTCRtpSender[] = []
    const { localStream } = this

    if (!_.isNil(localStream)) {
      for (const track of localStream.getTracks()) {
        const sender = peerConnection.addTrack(track, localStream)
        senders.push(sender)
      }
    }

    const peer: Peer = new Peer({
      remoteId,
      senders,
      peerConnection,
      useDataChannel: this.useDataChannel,
      useSoundMeter: this.useSoundMeter,
      dataHandler: this.dataHandler,
      soundHandler: this.soundHandler,
    })

    this.peers.push(peer)

    return peerConnection
  }

  async getLocalUserMediaStream(
    constraints: MediaStreamConstraints,
  ): Promise<MediaStream> {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia(
        constraints,
      )

      if (_.isNil(this.localStream)) {
        return (this.localStream = userMediaStream)
      }

      userMediaStream.getTracks().forEach(track => {
        this.upsertTrack(userMediaStream, track)
      })

      return this.localStream
    } catch (error) {
      throw error
    }
  }

  async getLocalDisplayMediaStream(
    constraints: Pick<MediaStreamConstraints, 'video'>,
  ): Promise<MediaStream> {
    try {
      const displayMediaStream = await navigator.mediaDevices.getDisplayMedia(
        constraints,
      )

      if (_.isNil(this.localStream)) {
        return (this.localStream = displayMediaStream)
      }

      displayMediaStream.getTracks().forEach(track => {
        this.upsertTrack(displayMediaStream, track)
      })

      return this.localStream
    } catch (error) {
      throw error
    }
  }

  async getEnumerateDevices() {
    try {
      const enumerateDevices = await window.navigator.mediaDevices.enumerateDevices()

      const videoInputs = enumerateDevices.filter(
        deviceInfo => deviceInfo.kind === 'videoinput',
      )
      const audioInputs = enumerateDevices.filter(
        deviceInfo => deviceInfo.kind === 'audioinput',
      )
      const audioOutputs = enumerateDevices.filter(
        deviceInfo => deviceInfo.kind === 'audiooutput',
      )

      return {
        videoInputs,
        audioInputs,
        audioOutputs,
      }
    } catch (error) {
      throw error
    }
  }

  getDeviceIds() {
    if (!this.localStream) {
      return []
    }

    return this.localStream
      .getTracks()
      .map(track => track.getSettings().deviceId)
  }

  async changeDevice(deviceInfo: MediaDeviceInfo) {
    try {
      if (_.isNil(this.localStream)) {
        return this.localStream
      }

      const deviceIds = this.getDeviceIds()

      if (deviceIds.includes(deviceInfo.deviceId)) {
        return this.localStream
      }

      const videoTrack = this.localStream.getVideoTracks()[0]
      const audioTrack = this.localStream.getAudioTracks()[0]

      if (deviceInfo.kind === 'videoinput') {
        await this.getLocalUserMediaStream({
          video: {
            deviceId: { exact: deviceInfo.deviceId },
          },
          audio: audioTrack.enabled
            ? {
                deviceId: { exact: audioTrack.getSettings().deviceId },
              }
            : false,
        })
      } else if (deviceInfo.kind === 'audioinput') {
        await this.getLocalUserMediaStream({
          video: videoTrack.enabled
            ? {
                deviceId: { exact: videoTrack.getSettings().deviceId },
              }
            : false,
          audio: {
            deviceId: { exact: deviceInfo.deviceId },
          },
        })
      } else if (deviceInfo.kind === 'audiooutput') {
        if (this.localVideoElement) {
          ;(this.localVideoElement as CustomVideoElement).setSinkId?.(
            deviceInfo.deviceId,
          )
        }
      }

      return this.localStream
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
      this.peers[peerIndex].clear()
      this.peers.splice(peerIndex, 1)
      this.dispatch(groundAction.deletePeerConnection({ remoteId }))
    }
  }

  async receiveOffer(
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

  receiveAnswer(
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

  receiveRemoteIceCandidate(remoteId: string, iceCandidate: RTCIceCandidate) {
    const candidate = new RTCIceCandidate(iceCandidate)
    const peer = this.getPeer(remoteId)

    if (!_.isNil(peer)) {
      peer.peerConnection.addIceCandidate(candidate)
    }
  }

  upsertTrack(stream: MediaStream, track: MediaStreamTrack) {
    if (_.isNil(this.localStream)) return

    const localTrack = this.localStream
      .getTracks()
      .find(localTrack => localTrack.kind === track.kind)

    if (!_.isNil(localTrack)) {
      this.localStream.removeTrack(localTrack)
      localTrack.stop()
    }
    this.localStream.addTrack(track)

    this.peers.forEach(({ senders, peerConnection }) => {
      const sender = senders.find(sender => sender.track?.kind === track.kind)

      if (!_.isNil(sender)) {
        sender.replaceTrack(track)
      } else {
        const sender = peerConnection.addTrack(track, stream)
        senders.push(sender)
      }
    })
  }

  getPeer(remoteId: string): Peer | undefined {
    return this.peers.find(peer => peer.remoteId === remoteId)
  }

  /* data channel utils */
  sendData(value: string, target?: string | string[]) {
    if (!this.useDataChannel) {
      Warn(`Not allowed to use data channel. Give useDataChannel option`)
      return
    }

    if (_.isNil(target)) {
      this.peers.forEach(peer => peer.sendData(value))
      return
    }

    if (_.isArray(target)) {
      this.peers.forEach(peer => {
        if (target.includes(peer.remoteId)) {
          peer.sendData(value)
        }
      })
      return
    }

    const peer = this.peers.find(peer => peer.remoteId === target)

    if (!_.isNil(peer)) {
      peer.sendData(value)
    }
  }

  /* sound utils */
  setVolume(value: number = 1, target?: string | string[]) {
    if (_.isNil(target)) {
      this.peers.forEach(peer => peer.setVolume(value))
      return
    }

    if (_.isArray(target)) {
      this.peers.forEach(peer => {
        if (target.includes(peer.remoteId)) {
          peer.setVolume(value)
        }
      })
      return
    }

    const peer = this.peers.find(peer => peer.remoteId === target)

    if (!_.isNil(peer)) {
      peer.setVolume(value)
    }
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

  /* clear func */
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
