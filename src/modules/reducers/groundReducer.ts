/* External dependencies */
import { call, take, fork, put, select, takeLatest } from 'redux-saga/effects'

/* Internal dependencies */
import Ground from 'models/Ground'
import { getGround } from 'modules/selectors/groundSelector'
import SocketEvent from 'constants/SocketEvent'
import { ActionType, createSocketChannel } from 'utils/reduxUtils'
import { actionCreator } from 'utils/reduxUtils'

type Action =
  | ActionType<CreateGroundPayload, {}, typeof CREATE_GROUND>
  | ActionType<undefined, {}, typeof CLEAR_GROUND>
  | ActionType<CreatePeerConnectionPayload, {}, typeof CREATE_PEER_CONNECTION>
  | ActionType<SetRemoteStreamPayload, {}, typeof SET_REMOTE_STREAM>

interface State {
  ground: Ground | null
}

interface CreateGroundPayload {
  localStream: MediaStream
}

interface CreatePeerConnectionPayload {
  remoteId: string
  peerConnection: RTCPeerConnection
}

interface SetRemoteStreamPayload {
  remoteStream: MediaStream
}

const ENTER_GROUND = 'ground/ENTER_GROUND' as const
const CREATE_GROUND = 'ground/CREATE_GROUND' as const
const LEAVE_GROUND = 'ground/LEAVE_GROUND' as const
const CLEAR_GROUND = 'ground/CLEAR_GROUND' as const
const CREATE_PEER_CONNECTION = 'ground/CREATE_PEER_CONNECTION' as const
const SET_REMOTE_STREAM = 'ground/SET_REMOTE_STREAM' as const

export const enterGround = actionCreator(ENTER_GROUND)
export const createGround = actionCreator<CreateGroundPayload>(CREATE_GROUND)
export const leaveGround = actionCreator(LEAVE_GROUND)
export const clearGround = actionCreator(CLEAR_GROUND)
export const createPeerConnection = actionCreator<CreatePeerConnectionPayload>(
  CREATE_PEER_CONNECTION,
)
export const setRemoteStream = actionCreator<SetRemoteStreamPayload>(
  SET_REMOTE_STREAM,
)

function* enterGroundSaga() {
  try {
    const mediaStream = yield call([navigator.mediaDevices, 'getUserMedia'], {
      video: true,
      audio: true,
    })

    yield put(createGround({ localStream: mediaStream }))
  } catch (error) {
    console.error(error)
  }
}

function* leaveGroundSaga() {
  const ground: Ground = yield select(getGround)
  ground?.hangUp()
  yield put(clearGround())
}

function* joinGroundSaga(eventType: SocketEvent) {
  try {
    const channel = yield call(createSocketChannel, eventType)

    while (true) {
      const remoteId = yield take(channel)
      const peerConnection = new RTCPeerConnection()

      yield put(createPeerConnection({ remoteId, peerConnection }))
    }
  } catch (error) {
    console.log(error)
  }
}

export function* groundSaga() {
  yield takeLatest(ENTER_GROUND, enterGroundSaga)
  yield takeLatest(LEAVE_GROUND, leaveGroundSaga)
  yield fork(joinGroundSaga, SocketEvent.Join)
}

const initialState: State = {
  ground: null,
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
        ground: null,
      }
    default:
      return state
  }
}

export default groundReducer
