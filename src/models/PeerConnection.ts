/* External dependencies */
import Immutable from 'immutable'
import _ from 'lodash'

/* Internal dependencies */
import SocketService from 'services/SocketService'
import SocketEvent from 'constants/SocketEvent'

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

    const { remoteId, peerConnection } = args

    if (!_.isNil(remoteId) && !_.isNil(peerConnection)) {
      peerConnection.onicecandidate = this.onIceCandidate
    }
  }

  onIceCandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      SocketService.emit(SocketEvent.IceCandidate, {
        remoteId: this.remoteId,
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      })
    }
  }
}

export default PeerConnection
