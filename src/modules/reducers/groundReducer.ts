/* External dependencies */
import { eventChannel } from 'redux-saga'
import {
  call,
  take,
  fork,
  put,
  select,
  takeLatest,
  takeEvery,
} from 'redux-saga/effects'
import _ from 'lodash'

/* Internal dependencies */
import Ground from 'models/Ground'
import PeerConnection from 'models/PeerConnection'
import { getGround, getLocalStream } from 'modules/selectors/groundSelector'
import SocketService from 'services/SocketService'
import SocketEvent from 'constants/SocketEvent'
import { ActionType, createSocketChannel } from 'utils/reduxUtils'
import { actionCreator } from 'utils/reduxUtils'

type Action =
  | ActionType<CreateGroundPayload, {}, typeof CREATE_GROUND>
  | ActionType<undefined, {}, typeof CLEAR_GROUND>
  | ActionType<CreatePeerConnectionPayload, {}, typeof CREATE_PEER_CONNECTION>

interface State {
  ground: Ground
}

interface EnterGroundPayload {
  roomId: string
}

interface LeaveGroundPayload {
  roomId: string
}

interface CreateGroundPayload {
  localStream: MediaStream
}

interface CreatePeerConnectionPayload {
  remoteId: string
  remoteStream: MediaStream
  peerConnection: RTCPeerConnection
}

interface WaitRemoteStreamPayload {
  remoteId: string
  peerConnection: RTCPeerConnection
}

const ENTER_GROUND = 'ground/ENTER_GROUND' as const
const CREATE_GROUND = 'ground/CREATE_GROUND' as const
const LEAVE_GROUND = 'ground/LEAVE_GROUND' as const
const CLEAR_GROUND = 'ground/CLEAR_GROUND' as const
const CREATE_PEER_CONNECTION = 'ground/CREATE_PEER_CONNECTION' as const
const WAIT_REMOTE_STREAM = 'ground/WAIT_REMOTE_STREAM' as const

export const enterGround = actionCreator<EnterGroundPayload>(ENTER_GROUND)
export const createGround = actionCreator<CreateGroundPayload>(CREATE_GROUND)
export const leaveGround = actionCreator<LeaveGroundPayload>(LEAVE_GROUND)
export const clearGround = actionCreator(CLEAR_GROUND)
export const createPeerConnection = actionCreator<CreatePeerConnectionPayload>(
  CREATE_PEER_CONNECTION,
)
export const waitRemoteStream = actionCreator<WaitRemoteStreamPayload>(
  WAIT_REMOTE_STREAM,
)

function* enterGroundSaga(
  action: ActionType<EnterGroundPayload, {}, typeof ENTER_GROUND>,
) {
  try {
    const { roomId } = action.payload
    const mediaStream = yield call([navigator.mediaDevices, 'getUserMedia'], {
      video: true,
      audio: true,
    })

    yield put(createGround({ localStream: mediaStream }))
    SocketService.emit(SocketEvent.EnterGround, roomId)
  } catch (error) {
    console.error(error)
  }
}

function* leaveGroundSaga(
  action: ActionType<LeaveGroundPayload, {}, typeof LEAVE_GROUND>,
) {
  const { roomId } = action.payload
  const ground: Ground = yield select(getGround)
  ground.hangUp()
  yield put(clearGround())
  SocketService.emit(SocketEvent.LeaveGround, roomId)
}

function* joinGroundSaga(eventType: SocketEvent) {
  try {
    const channel = yield call(createSocketChannel, eventType)
    const localStream = yield select(getLocalStream)

    while (true) {
      const remoteId = yield take(channel)
      const peerConnection = new RTCPeerConnection()

      yield put(waitRemoteStream({ remoteId, peerConnection }))

      for (const track of localStream.getTracks()) {
        peerConnection.addTrack(track)
      }
    }
  } catch (error) {
    console.log(error)
  }
}

function* waitRemoteStreamSaga(
  action: ActionType<WaitRemoteStreamPayload, {}, typeof WAIT_REMOTE_STREAM>,
) {
  try {
    const { remoteId, peerConnection } = action.payload
    const remoteStream = yield take(
      eventChannel(emitter => {
        peerConnection.ontrack = (event: RTCTrackEvent) => {
          const remoteStream = event.streams[0]
          emitter(remoteStream)
        }
        return _.noop
      }),
    )

    yield put(createPeerConnection({ remoteId, remoteStream, peerConnection }))
  } catch (error) {
    console.log(error)
  }
}

export function* groundSaga() {
  yield takeLatest(ENTER_GROUND, enterGroundSaga)
  yield takeLatest(LEAVE_GROUND, leaveGroundSaga)
  yield fork(joinGroundSaga, SocketEvent.Join)
  yield takeEvery(WAIT_REMOTE_STREAM, waitRemoteStreamSaga)
}

const initialState: State = {
  ground: new Ground(),
}

function groundReducer(state: State = initialState, action: Action) {
  switch (action.type) {
    case CREATE_GROUND:
      const { localStream } = action.payload
      return {
        ...state,
        ground: new Ground({ localStream }),
      }
    case CLEAR_GROUND:
      return {
        ...state,
        ground: new Ground(),
      }
    case CREATE_PEER_CONNECTION:
      return {
        ...state,
        ground: state.ground.update('peerConnections', peerConnections =>
          peerConnections.push(new PeerConnection(action.payload)),
        ),
      }
    default:
      return state
  }
}

export default groundReducer
