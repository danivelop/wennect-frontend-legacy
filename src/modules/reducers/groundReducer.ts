/* External dependencies */
import { call, take, fork, put, select } from 'redux-saga/effects'

/* Internal dependencies */
import Ground from 'models/Ground'
import { getGround } from 'modules/selectors/groundSelector'
import { ActionType, createSocketChannel } from 'utils/reduxUtils'
import { actionCreator } from 'utils/reduxUtils'
import SocketEvent from 'constants/SocketEvent'

type Action =
  | ActionType<CreateGroundPayload, {}, typeof CREATE_GROUND>
  | ActionType<undefined, {}, typeof LEAVE_GROUND>

interface State {
  ground: Ground | null
}

interface CreateGroundPayload {
  localStream: MediaStream
}

const CREATE_GROUND = 'ground/CREATE_GROUND' as const
const LEAVE_GROUND = 'ground/LEAVE_GROUND' as const

export const createGround = actionCreator<CreateGroundPayload>(CREATE_GROUND)
export const leaveGround = actionCreator(LEAVE_GROUND)

function* leaveGroundSaga(eventType: SocketEvent) {
  const channel = yield call(createSocketChannel, eventType)

  try {
    while (true) {
      yield take(channel)
      const ground: Ground = yield select(getGround)

      ground.hangUp()
      yield put(leaveGround())
    }
  } catch (error) {
    console.log(error)
  }
}

export function* groundSaga() {
  yield fork(leaveGroundSaga, SocketEvent.LeaveGround)
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
    case LEAVE_GROUND:
      return {
        ...state,
        ground: null,
      }
    default:
      return state
  }
}

export default groundReducer
