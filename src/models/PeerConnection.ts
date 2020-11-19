/* External dependencies */
import Immutable from 'immutable'

/* Internal dependencies */

export interface PeerConnectionAttr {
  remoteStream: MediaStream | null
  peerConnection: RTCPeerConnection | null
}

const PeerConnectionRecord = Immutable.Record<PeerConnectionAttr>({
  remoteStream: null,
  peerConnection: null,
})

class PeerConnection extends PeerConnectionRecord {
  constructor(args: any = {}) {
    super(args)
  }
}

export default PeerConnection
