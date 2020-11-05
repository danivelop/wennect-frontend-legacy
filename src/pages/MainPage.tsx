/* External dependencies */
import React from 'react'

/* Internal dependencies */
import RoomListContainer from 'containers/RoomListContainer'
import GlobalTopBar from 'components/GlobalTopBar'

function MainPage() {
  return (
    <>
      <GlobalTopBar />
      <RoomListContainer />
    </>
  )
}

export default MainPage
