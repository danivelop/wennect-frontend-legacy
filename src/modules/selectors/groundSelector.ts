/* External dependencies */
import { createSelector } from 'reselect'

/* Internal dependencies */
import { RootState } from 'modules/reducers'

export const getGround = (state: RootState) => state.groundReducer.ground

export const getLocalStream = (state: RootState) =>
  state.groundReducer.ground.localStream

export const getPeerConnections = (state: RootState) =>
  state.groundReducer.ground.peerConnections

export const getPeerConnection = createSelector(
  getPeerConnections,
  (_, remoteId: string) => remoteId,
  (peerConnections, remoteId) =>
    peerConnections.find(pc => pc.remoteId === remoteId),
)
