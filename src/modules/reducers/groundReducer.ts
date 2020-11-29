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
import {
  getGround,
  getLocalStream,
  getPeerConnection,
} from 'modules/selectors/groundSelector'
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

interface WaitLocalIceCandidatePayload {
  remoteId: string
  peerConnection: RTCPeerConnection
}

const ENTER_GROUND = 'ground/ENTER_GROUND' as const
const CREATE_GROUND = 'ground/CREATE_GROUND' as const
const LEAVE_GROUND = 'ground/LEAVE_GROUND' as const
const CLEAR_GROUND = 'ground/CLEAR_GROUND' as const
const CREATE_PEER_CONNECTION = 'ground/CREATE_PEER_CONNECTION' as const
const WAIT_REMOTE_STREAM = 'ground/WAIT_REMOTE_STREAM' as const
const WAIT_LOCAL_ICE_CANDIDATE = 'ground/WAIT_LOCAL_ICE_CANDIDATE' as const

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
export const waitIceCandidate = actionCreator<WaitLocalIceCandidatePayload>(
  WAIT_LOCAL_ICE_CANDIDATE,
)

function* enterGroundSaga(
  action: ActionType<EnterGroundPayload, {}, typeof ENTER_GROUND>,
) {
  try {
    const { roomId } = action.payload
    const mediaStream = yield call([navigator.mediaDevices, 'getUserMedia'], {
      video: true,
      audio: false,
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
  SocketService.emit(SocketEvent.LeaveGround, roomId)
  yield put(clearGround())
}

function* joinGroundSaga(eventType: SocketEvent) {
  try {
    const channel = yield call(createSocketChannel, eventType)

    while (true) {
      const remoteId = yield take(channel)
      const localStream = yield select(getLocalStream)
      const peerConnection = new RTCPeerConnection()

      yield put(waitIceCandidate({ remoteId, peerConnection }))
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

function* waitLocalIceCandidateSaga(
  action: ActionType<
    WaitLocalIceCandidatePayload,
    {},
    typeof WAIT_LOCAL_ICE_CANDIDATE
  >,
) {
  try {
    const { remoteId, peerConnection } = action.payload
    const candidate = yield take(
      eventChannel(emitter => {
        peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
          emitter(event.candidate)
        }
        return _.noop
      }),
    )

    if (!_.isNil(candidate)) {
      SocketService.emit(SocketEvent.IceCandidate, {
        remoteId,
        label: candidate.sdpMLineIndex,
        id: candidate.sdpMid,
        candidate: candidate.candidate,
      })
    }
  } catch (error) {
    console.log(error)
  }
}

function* waitRemoteIceCandidateSaga(eventType: SocketEvent) {
  try {
    const channel = yield call(createSocketChannel, eventType)

    while (true) {
      const payload = yield take(channel)
      const peerConnection = yield select(state =>
        getPeerConnection(state, payload.remoteId),
      )
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: payload.label,
        candidate: payload.candidate,
      })
      peerConnection.addIceCandidate(candidate)
    }
  } catch (error) {
    console.log(error)
  }
}

export function* groundSaga() {
  yield takeLatest(ENTER_GROUND, enterGroundSaga)
  yield takeLatest(LEAVE_GROUND, leaveGroundSaga)
  yield fork(joinGroundSaga, SocketEvent.Join)
  yield takeEvery(WAIT_REMOTE_STREAM, waitRemoteStreamSaga)
  yield takeEvery(WAIT_LOCAL_ICE_CANDIDATE, waitLocalIceCandidateSaga)
  yield fork(waitRemoteIceCandidateSaga, SocketEvent.IceCandidate)
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
