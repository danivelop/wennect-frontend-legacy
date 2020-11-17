/* External dependencies */
import React from 'react'
import { Switch, Route, useRouteMatch } from 'react-router-dom'

/* Internal dependencies */
import { GroundListPage, GroundPage } from 'pages'
import GlobalTopBar from 'components/GlobalTopBar'

function MainPage() {
  const match = useRouteMatch()

  return (
    <>
      <GlobalTopBar />
      <Switch>
        <Route exact path={match.path} component={GroundListPage} />
        <Route exact path={`${match.path}/:roomId`} component={GroundPage} />
      </Switch>
    </>
  )
}

export default MainPage
