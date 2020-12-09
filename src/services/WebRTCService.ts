/* External dependencies */
import _ from 'lodash'

/* Internal dependencies */
import * as groundAction from 'modules/reducers/groundReducer'
import ReduxStore from 'modules/reduxStore'
import SocketService from 'services/SocketService'
import SocketEvent from 'constants/SocketEvent'

interface ConstraintsType {
  video?: boolean
  audio?: boolean
}
interface Peer {
  remoteId: string
  remoteStream?: MediaStream
  senders: RTCRtpSender[]
  peerConnection: RTCPeerConnection
}

interface IceCandidateResponse extends RTCIceCandidate {
  remoteId: string
}

interface OfferResponse {
  remoteId: string
  sessionDescription: RTCSessionDescriptionInit
}

interface AnswerResponse {
  remoteId: string
  sessionDescription: RTCSessionDescriptionInit
}

class WebRTC {
  localStream: MediaStream | null = null
  peers: Peer[] = []

  init() {
    SocketService.on(SocketEvent.Enter, this.enterRemotePeer.bind(this))
    SocketService.on(SocketEvent.Leave, this.leaveRemotePeer.bind(this))
    SocketService.on(SocketEvent.Offer, this.waitOffer.bind(this))
    SocketService.on(SocketEvent.Answer, this.waitAnswer.bind(this))
    SocketService.on(
      SocketEvent.IceCandidate,
      this.waitRemoteIceCandidate.bind(this),
    )
  }

  enter(roomId: string) {
    SocketService.emit(SocketEvent.Enter, roomId)
  }

  leave(roomId: string) {
    SocketService.emit(SocketEvent.Leave, roomId)
  }

  createPeerConnection(remoteId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection()
    const peer: Peer = { remoteId, senders: [], peerConnection }

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

      SocketService.emit(SocketEvent.Offer, {
        remoteId,
        sessionDescription: localSessionDescription,
      })
    } catch (error) {
      console.error(error)
    }
  }

  leaveRemotePeer(remoteId: string) {
    const peerIndex = this.peers.findIndex(peer => peer.remoteId === remoteId)
    if (peerIndex >= 0) {
      this.peers.splice(peerIndex, 1)
    }
    this.dispatch(groundAction.deletePeerConnection({ remoteId }))
  }

  async waitOffer(response: OfferResponse) {
    const { remoteId, sessionDescription: remoteSessionDescription } = response
    const peerConnection = this.createPeerConnection(remoteId)

    peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteSessionDescription),
    )

    try {
      const localSessionDescription = await peerConnection.createAnswer()
      peerConnection.setLocalDescription(localSessionDescription)

      SocketService.emit(SocketEvent.Answer, {
        remoteId,
        sessionDescription: localSessionDescription,
      })
    } catch (error) {
      console.error(error)
    }
  }

  waitAnswer(response: AnswerResponse) {
    const { remoteId, sessionDescription: remoteSessionDescription } = response
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
      const { candidate: eventCandidate } = event

      if (!_.isNil(eventCandidate)) {
        const { sdpMLineIndex, candidate } = eventCandidate
        SocketService.emit(SocketEvent.IceCandidate, {
          remoteId,
          sdpMLineIndex,
          candidate,
        })
      }
    }
  }

  waitRemoteIceCandidate(response: IceCandidateResponse) {
    const { remoteId, ...payload } = response
    const candidate = new RTCIceCandidate(payload)
    const peer = this.getPeer(remoteId)

    if (!_.isNil(peer)) {
      peer.peerConnection.addIceCandidate(candidate)
    }
  }

  setVideo(enabled: boolean) {
    if (_.isNil(this.localStream)) {
      return console.log('No local video available.')
    }
    const videoTracks: MediaStreamTrack[] = this.localStream.getVideoTracks()

    if (_.isEmpty(videoTracks)) {
      return console.log('No local video available.')
    }

    for (let i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = enabled
    }
  }

  setAudio(enabled: boolean) {
    if (_.isNil(this.localStream)) {
      return console.log('No local audio available.')
    }
    const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks()

    if (_.isEmpty(audioTracks)) {
      return console.log('No local audio available.')
    }

    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = enabled
    }
  }

  hangUp() {
    SocketService.off(SocketEvent.Enter, this.enterRemotePeer)
    SocketService.off(SocketEvent.Leave, this.leaveRemotePeer)
    SocketService.off(SocketEvent.Offer, this.waitOffer)
    SocketService.off(SocketEvent.Answer, this.waitAnswer)
    SocketService.off(SocketEvent.IceCandidate, this.waitRemoteIceCandidate)

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

  getPeer(remoteId: string): Peer | undefined {
    return this.peers.find(pc => pc.remoteId === remoteId)
  }

  dispatch(action) {
    ReduxStore.dispatch(action)
  }
}

export default new WebRTC()
