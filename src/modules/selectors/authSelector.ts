/* Internal dependencies */
import { RootState } from 'modules/reducers'

export const isLoggedIn = (state: RootState) => state.authReducer.isLoggedIn
