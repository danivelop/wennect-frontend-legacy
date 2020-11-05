/* External dependencies */
import React, { useRef, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Formik, Form, Field } from 'formik'
import classNames from 'classnames/bind'
import _ from 'lodash'

/* Internal dependencies */
import { signin } from 'modules/reducers/authReducer'
import styles from './Signin.module.scss'

interface SigninForm {
  username: string
  password: string
}

const cx = classNames.bind(styles)

function Signin() {
  const history = useHistory()
  const dispatch = useDispatch()

  const handleSubmit = useCallback(
    async (values: SigninForm, { setSubmitting }) => {
      try {
        await dispatch(signin(values)).promise
        history.push('/')
      } catch (error) {
        const message = _.get(
          error,
          'response.data.message',
          'some error happened',
        )
        alert(message)
      } finally {
        setSubmitting(false)
      }
    },
    [dispatch, history],
  )

  const formikConfig = useRef({
    initialValues: {
      username: '',
      password: '',
    },
    onSubmit: handleSubmit,
  })

  return (
    <div className={cx('signin-wrapper')}>
      <h2>Sign in to Wennect</h2>
      <div className={cx('signin-form')}>
        <Formik {...formikConfig.current}>
          <Form>
            <div className={cx('field')}>
              <p className={cx('label')}>Username</p>
              <Field
                className={cx('input')}
                name="username"
                type="text"
                placeholder=""
              />
            </div>
            <div className={cx('field')}>
              <p className={cx('label')}>Password</p>
              <Field
                className={cx('input')}
                name="password"
                type="password"
                autoComplete="off"
                placeholder=""
              />
            </div>
            <button type="submit">Sign in</button>
          </Form>
        </Formik>
      </div>
    </div>
  )
}

export default Signin
