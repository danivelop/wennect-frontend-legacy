/* External dependencies */
import React, { useEffect } from 'react'
import { Switch, Route, useRouteMatch } from 'react-router-dom'
import { Manager } from 'socket.io-client'

/* Internal dependencies */
import { GroundListPage, GroundPage } from 'pages'
import GlobalTopBar from 'components/GlobalTopBar'

function MainPage() {
  const match = useRouteMatch()

  useEffect(() => {
    const manager = new Manager('http://localhost:4000')
    const socket = manager.socket('/')

    socket.emit('createRoom', 'room')
    socket.on('created', message => {
      console.log(message)
    })
  }, [])

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
