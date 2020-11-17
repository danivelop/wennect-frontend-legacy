/* External dependencies */
import Immutable from 'immutable'

/* Internal dependencies */

export interface PeerConnectionAttr {
  remoteStream: MediaStream | null
  localPeerConnection: RTCPeerConnection | null
  remotePeerConnection: RTCPeerConnection | null
}

const PeerConnectionRecord = Immutable.Record<PeerConnectionAttr>({
  remoteStream: null,
  localPeerConnection: null,
  remotePeerConnection: null,
})

class PeerConnection extends PeerConnectionRecord {
  constructor(args: any = {}) {
    super(args)
  }
}

export default PeerConnection
