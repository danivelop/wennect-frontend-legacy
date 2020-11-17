/* External dependencies */
import Immutable from 'immutable'

/* Internal dependencies */
import PeerConnection from 'models/PeerConnection'

export interface GroundAttr {
  localStream: MediaStream | null
  constraints: MediaStreamConstraints
  peerConnections: Immutable.List<PeerConnection>
}

const GroundRecord = Immutable.Record<GroundAttr>({
  localStream: null,
  constraints: {
    video: true,
    audio: true,
  },
  peerConnections: Immutable.List(),
})

class Ground extends GroundRecord {
  constructor(args: any = {}) {
    super(args)
  }
}

export default Ground
