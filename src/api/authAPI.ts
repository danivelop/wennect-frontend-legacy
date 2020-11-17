/* External dependencies */
import axios from 'axios'

/* Internal dependencies */
import { ResponseType } from 'utils/reduxUtils'

interface User {
  id: number
  username: string
}

export interface SigninResponseType {
  user: User
  isLoggedIn: boolean
  message?: string
}

export interface SignupResponseType {
  message?: string
}

export interface GetLoggedInResponseType {
  user: User
  isLoggedIn: boolean
  message?: string
}

export const signin: ResponseType<SigninResponseType> = ({
  username,
  password,
}) => {
  return axios.post('/api/auth/signin', { username, password })
}

export const signup: ResponseType<SignupResponseType> = ({
  username,
  password,
}) => {
  return axios.post('/api/auth/signup', { username, password })
}

export const signout: ResponseType<{}> = () => {
  return axios.post('/api/auth/signout')
}

export const getLoggedIn: ResponseType<GetLoggedInResponseType> = () => {
  return axios.post('/api/auth/isLoggedIn')
}
