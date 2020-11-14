/* External dependencies */
import _ from 'lodash'

export interface WebRTCType {
  localVideo: HTMLVideoElement
  remoteVideo: HTMLVideoElement | null
  localStream: MediaStream | null
  remotStream: MediaStream | null
  localPeerConnection: RTCPeerConnection | null
  remotePeerConnection: RTCPeerConnection | null
  constraints: MediaStreamConstraints
}

class WebRTC implements WebRTCType {
  localVideo: HTMLVideoElement
  remoteVideo: HTMLVideoElement | null
  localStream: MediaStream | null
  remotStream: MediaStream | null
  localPeerConnection: RTCPeerConnection | null
  remotePeerConnection: RTCPeerConnection | null
  constraints: MediaStreamConstraints

  constructor({ videoElement, enableVideo, enableAudio }) {
    this.localVideo = videoElement
    this.remoteVideo = null
    this.localStream = null
    this.remotStream = null
    this.localPeerConnection = null
    this.remotePeerConnection = null
    this.constraints = {
      video: enableVideo,
      audio: enableAudio,
    }
  }

  async getLocalMediaStream() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        this.constraints,
      )
      this.localVideo.srcObject = this.localStream = mediaStream
    } catch (error) {
      console.error(error)
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
    _.set(this.constraints, 'video', enabled)
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
    _.set(this.constraints, 'audio', enabled)
  }

  getConstraints() {
    return this.constraints
  }

  hangUp() {
    this.localStream?.getTracks().forEach(track => track.stop())
    this.localPeerConnection?.close()
    this.localStream = null
    this.localPeerConnection = null
  }
}

export default WebRTC
