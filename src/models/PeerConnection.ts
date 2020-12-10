/* External dependencies */
import Immutable from 'immutable'

export interface PeerConnectionAttr {
  remoteId: string
  remoteStream: MediaStream | null
  peerConnection: RTCPeerConnection | null
}

const PeerConnectionRecord = Immutable.Record<PeerConnectionAttr>({
  remoteId: '',
  remoteStream: null,
  peerConnection: null,
})

class PeerConnection extends PeerConnectionRecord {
  constructor(args: any = {}) {
    super(args)
  }
}

export default PeerConnection
