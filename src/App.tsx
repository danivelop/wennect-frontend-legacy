/* External dependencies */
import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

/* Internal dependencies */
import { SigninPage, MainPage, SignupPage } from 'pages'
import { GlobalStyle } from 'styles/global-styles'

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/" component={MainPage} />
        <Route exact path="/signin" component={SigninPage} />
        <Route exact path="/signup" component={SignupPage} />
      </Switch>
      <GlobalStyle />
    </BrowserRouter>
  )
}

export default App
