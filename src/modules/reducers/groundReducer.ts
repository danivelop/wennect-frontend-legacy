/* External dependencies */
import Immutable from 'immutable'

/* Internal dependencies */
import PeerConnection from 'models/PeerConnection'
import { ActionType } from 'utils/reduxUtils'
import { actionCreator } from 'utils/reduxUtils'

type Action =
  | ActionType<CreatePeerConnectionPayload, {}, typeof CREATE_PEER_CONNECTION>
  | ActionType<DeletePeerConnectionPayload, {}, typeof DELETE_PEER_CONNECTION>

interface State {
  peerConnections: Immutable.OrderedMap<string, PeerConnection>
}

interface CreatePeerConnectionPayload {
  remoteId: string
  remoteStream: MediaStream
  peerConnection: RTCPeerConnection
}

interface DeletePeerConnectionPayload {
  remoteId: string
}

const CREATE_PEER_CONNECTION = 'ground/CREATE_PEER_CONNECTION' as const
const DELETE_PEER_CONNECTION = 'ground/DELETE_PEER_CONNECTION' as const

export const createPeerConnection = actionCreator<CreatePeerConnectionPayload>(
  CREATE_PEER_CONNECTION,
)

export const deletePeerConnection = actionCreator<DeletePeerConnectionPayload>(
  DELETE_PEER_CONNECTION,
)

const initialState: State = {
  peerConnections: Immutable.OrderedMap(),
}

function groundReducer(state: State = initialState, action: Action) {
  switch (action.type) {
    case CREATE_PEER_CONNECTION:
      return {
        ...state,
        peerConnections: state.peerConnections.set(
          action.payload.remoteId,
          new PeerConnection(action.payload),
        ),
      }
    case DELETE_PEER_CONNECTION:
      return {
        ...state,
        peerConnections: state.peerConnections.delete(action.payload.remoteId),
      }
    default:
      return state
  }
}

export default groundReducer
