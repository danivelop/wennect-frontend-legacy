/* External dependencies */
import React from 'react'
import { Switch, Route } from 'react-router-dom'

/* Internal dependencies */
import { GroundListPage, GroundPage } from 'pages'
import GlobalTopBar from 'components/GlobalTopBar'

function MainPage() {
  return (
    <>
      <GlobalTopBar />
      <Switch>
        <Route exact path="/" component={GroundListPage} />
        <Route exact path="/:roomId" component={GroundPage} />
      </Switch>
    </>
  )
}

export default MainPage
