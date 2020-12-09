/* Internal dependencies */
import { RootState } from 'modules/reducers'

export const getPeerConnections = (state: RootState) =>
  state.groundReducer.peerConnections.toList()
