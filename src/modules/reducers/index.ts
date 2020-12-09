/* External dependencies */
import { combineReducers } from 'redux'
import { all } from 'redux-saga/effects'

/* Internal dependencies */
import authReducer, { authSaga } from './authReducer'
import groundReducer from './groundReducer'

const rootReducer = combineReducers({
  authReducer,
  groundReducer,
})

export function* rootSaga() {
  yield all([authSaga()])
}

export default rootReducer
export type RootState = ReturnType<typeof rootReducer>
