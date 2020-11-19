/* External dependencies */
import { RootState } from 'modules/reducers'

export const getGround = (state: RootState) => state.groundReducer.ground

export const getLocalStream = (state: RootState) =>
  state.groundReducer.ground?.localStream
