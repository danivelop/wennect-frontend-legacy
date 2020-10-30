/* External dependencies */
import React from 'react'
import { Route, Switch } from 'react-router-dom'

/* Internal dependencies */
import { MainPage } from 'pages'

function App() {
  return (
    <Switch>
      <Route exact path="/" component={MainPage} />
    </Switch>
  )
}

export default App
