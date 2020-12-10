/* External dependencies */
import Immutable from 'immutable'
import _ from 'lodash'

/* Internal dependencies */
import PeerConnection from 'models/PeerConnection'
import { Error } from 'utils/consoleUtils'

export interface GroundAttr {
  localStream: MediaStream | null
  peerConnections: Immutable.List<PeerConnection>
}

const GroundRecord = Immutable.Record<GroundAttr>({
  localStream: null,
  peerConnections: Immutable.List(),
})

class Ground extends GroundRecord {
  constructor(args: any = {}) {
    super(args)
  }

  setVideo(enabled: boolean) {
    if (_.isNil(this.localStream)) {
      return Error('No local video available.')
    }
    const videoTracks: MediaStreamTrack[] = this.localStream.getVideoTracks()

    if (_.isEmpty(videoTracks)) {
      return Error('No local video available.')
    }

    for (let i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = enabled
    }
  }

  setAudio(enabled: boolean) {
    if (_.isNil(this.localStream)) {
      return Error('No local audio available.')
    }
    const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks()

    if (_.isEmpty(audioTracks)) {
      return Error('No local audio available.')
    }

    for (let i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = enabled
    }
  }

  hangUp() {
    this.localStream?.getTracks().forEach(track => track.stop())
  }
}

export default Ground
