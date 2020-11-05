/* External dependencies */
import axios from 'axios'

/* Internal dependencies */
import { ResponseType } from 'utils/reduxUtils'

interface User {
  id: number
  username: string
}

export interface signinResponseType {
  user: User
  isLoggedIn: boolean
  message?: string
}

export interface signupResponseType {
  message?: string
}

export interface getLoggedInResponseType {
  user: User
  isLoggedIn: boolean
  message?: string
}

export const signin: ResponseType<signinResponseType> = ({
  username,
  password,
}) => {
  return axios.post('/api/auth/signin', { username, password })
}

export const signup: ResponseType<signupResponseType> = ({
  username,
  password,
}) => {
  return axios.post('/api/auth/signup', { username, password })
}

export const signout: ResponseType<{}> = () => {
  return axios.post('/api/auth/signout')
}

export const getLoggedIn: ResponseType<getLoggedInResponseType> = () => {
  return axios.post('/api/auth/isLoggedIn')
}
