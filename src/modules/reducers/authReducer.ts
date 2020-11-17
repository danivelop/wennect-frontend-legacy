/* External dependencies */
import { takeLatest } from 'redux-saga/effects'

/* Internal dependencies */
import User from 'models/User'
import * as authAPI from 'api/authAPI'
import {
  AsyncActionTypes,
  actionCreator,
  createAsyncActionsAndSaga,
} from 'utils/reduxUtils'

type Action =
  | AsyncActionTypes<typeof signinAsyncActions>
  | AsyncActionTypes<typeof signupAsyncActions>
  | AsyncActionTypes<typeof signoutAsyncActions>
  | AsyncActionTypes<typeof getLoggedInAsyncActions>

interface State {
  user: User | null
  isLoggedIn: boolean
  signinFetching: boolean
  signinSuccess: boolean
  signinError: boolean
  signupFetching: boolean
  signupSuccess: boolean
  signupError: boolean
  signoutFetching: boolean
  signoutSuccess: boolean
  signoutError: boolean
  getLoggedInFetching: boolean
  getLoggedInSuccess: boolean
  getLoggedInError: boolean
}

export interface SigninPayload {
  username: string
  password: string
}

export interface SignupPayload {
  username: string
  password: string
}

const SIGNIN = 'auth/SIGNIN' as const
const SIGNIN_FETCHING = 'auth/SIGNIN_FETCHING' as const
const SIGNIN_SUCCESS = 'auth/SIGNIN_SUCCESS' as const
const SIGNIN_ERROR = 'auth/SIGNIN_ERROR' as const
const SIGNUP = 'auth/SIGNUP' as const
const SIGNUP_FETCHING = 'auth/SIGNUP_FETCHING' as const
const SIGNUP_SUCCESS = 'auth/SIGNUP_SUCCESS' as const
const SIGNUP_ERROR = 'auth/SIGNUP_ERROR' as const
const SIGNOUT = 'auth/SIGNOUT' as const
const SIGNOUT_FETCHING = 'auth/SIGNOUT_FETCHING' as const
const SIGNOUT_SUCCESS = 'auth/SIGNOUT_SUCCESS' as const
const SIGNOUT_ERROR = 'auth/SIGNOUT_ERROR' as const
const GET_LOGGED_IN = 'auth/GET_LOGGED_IN' as const
const GET_LOGGED_IN_FETCHING = 'auth/GET_LOGGED_IN_FETCHING' as const
const GET_LOGGED_IN_SUCCESS = 'auth/GET_LOGGED_IN_SUCCESS' as const
const GET_LOGGED_IN_ERROR = 'auth/GET_LOGGED_IN_ERROR' as const

export const signin = actionCreator<SigninPayload>(SIGNIN, {
  usePromise: true,
})

export const signup = actionCreator<SigninPayload>(SIGNUP, {
  usePromise: true,
})

export const signout = actionCreator(SIGNOUT, {
  usePromise: true,
})

export const getLoggedIn = actionCreator(GET_LOGGED_IN, {
  usePromise: true,
})

const {
  asyncActions: signinAsyncActions,
  asyncSaga: signinSaga,
} = createAsyncActionsAndSaga(
  SIGNIN_FETCHING,
  SIGNIN_SUCCESS,
  SIGNIN_ERROR,
)<ReturnType<typeof signin>, authAPI.SigninResponseType, any>(authAPI.signin)

const {
  asyncActions: signupAsyncActions,
  asyncSaga: signupSaga,
} = createAsyncActionsAndSaga(
  SIGNUP_FETCHING,
  SIGNUP_SUCCESS,
  SIGNUP_ERROR,
)<ReturnType<typeof signup>, authAPI.SignupResponseType, any>(authAPI.signup)

const {
  asyncActions: signoutAsyncActions,
  asyncSaga: signoutSaga,
} = createAsyncActionsAndSaga(
  SIGNOUT_FETCHING,
  SIGNOUT_SUCCESS,
  SIGNOUT_ERROR,
)<ReturnType<typeof signout>, {}, any>(authAPI.signout)

const {
  asyncActions: getLoggedInAsyncActions,
  asyncSaga: getLoggedInSaga,
} = createAsyncActionsAndSaga(
  GET_LOGGED_IN_FETCHING,
  GET_LOGGED_IN_SUCCESS,
  GET_LOGGED_IN_ERROR,
)<ReturnType<typeof getLoggedIn>, authAPI.GetLoggedInResponseType, any>(
  authAPI.getLoggedIn,
)

export function* authSaga() {
  yield takeLatest(SIGNIN, signinSaga)
  yield takeLatest(SIGNUP, signupSaga)
  yield takeLatest(SIGNOUT, signoutSaga)
  yield takeLatest(GET_LOGGED_IN, getLoggedInSaga)
}

const initialState: State = {
  user: null,
  isLoggedIn: false,
  signinFetching: false,
  signinSuccess: false,
  signinError: false,
  signupFetching: false,
  signupSuccess: false,
  signupError: false,
  signoutFetching: false,
  signoutSuccess: false,
  signoutError: false,
  getLoggedInFetching: false,
  getLoggedInSuccess: false,
  getLoggedInError: false,
}

function authReducer(state: State = initialState, action: Action) {
  switch (action.type) {
    case SIGNIN_FETCHING:
      return {
        ...state,
        signinFetching: true,
        signinSuccess: false,
        signinError: false,
      }
    case SIGNIN_SUCCESS:
      return {
        ...state,
        user: new User(action.payload.user),
        isLoggedIn: action.payload.isLoggedIn,
        signinFetching: false,
        signinSuccess: true,
        signinError: false,
      }
    case SIGNIN_ERROR:
      return {
        ...state,
        signinFetching: false,
        signinSuccess: false,
        signinError: true,
      }
    case SIGNUP_FETCHING:
      return {
        ...state,
        signupFetching: true,
        signupSuccess: false,
        signupError: false,
      }
    case SIGNUP_SUCCESS:
      return {
        ...state,
        signupFetching: false,
        signupSuccess: true,
        signupError: false,
      }
    case SIGNUP_ERROR:
      return {
        ...state,
        signupFetching: false,
        signupSuccess: false,
        signupError: true,
      }
    case SIGNOUT_FETCHING:
      return {
        ...state,
        signoutFetching: true,
        signoutSuccess: false,
        signoutError: false,
      }
    case SIGNOUT_SUCCESS:
      return {
        ...state,
        user: null,
        isLoggedIn: false,
        signoutFetching: false,
        signoutSuccess: true,
        signoutError: false,
      }
    case SIGNOUT_ERROR:
      return {
        ...state,
        signoutFetching: false,
        signoutSuccess: false,
        signoutError: true,
      }
    case GET_LOGGED_IN_FETCHING:
      return {
        ...state,
        getLoggedInFetching: true,
        getLoggedInSuccess: false,
        getLoggedInError: false,
      }
    case GET_LOGGED_IN_SUCCESS:
      return {
        ...state,
        user: new User(action.payload.user),
        isLoggedIn: action.payload.isLoggedIn,
        getLoggedInFetching: false,
        getLoggedInSuccess: true,
        getLoggedInError: false,
      }
    case GET_LOGGED_IN_ERROR:
      return {
        ...state,
        getLoggedInFetching: false,
        getLoggedInSuccess: false,
        getLoggedInError: true,
      }
    default:
      return state
  }
}

export default authReducer
