/* External dependencies */
import React, { useRef, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Formik, Form, Field } from 'formik'
import classNames from 'classnames/bind'
import _ from 'lodash'

/* Internal dependencies */
import { signup } from 'modules/reducers/authReducer'
import styles from './Signup.module.scss'

interface SignupForm {
  username: string
  password: string
  passwordConfirm
}

const cx = classNames.bind(styles)

function Signin() {
  const history = useHistory()
  const dispatch = useDispatch()

  const handleSubmit = useCallback(
    async (values: SignupForm, { setSubmitting }) => {
      const { username, password, passwordConfirm } = values

      if (password !== passwordConfirm) {
        return alert('Password confirm is wrong! Please check again.')
      }

      try {
        const result = await dispatch(signup({ username, password })).promise
        const message = _.get(result, 'data.message', 'signup success!')
        alert(message)
        history.push('/signin')
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
      passwordConfirm: '',
    },
    onSubmit: handleSubmit,
  })

  return (
    <div className={cx('signin-wrapper')}>
      <h2>Sign up to Wennect</h2>
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
            <div className={cx('field')}>
              <p className={cx('label')}>Confirm Password</p>
              <Field
                className={cx('input')}
                name="passwordConfirm"
                type="password"
                autoComplete="off"
                placeholder=""
              />
            </div>
            <button type="submit">Sign up</button>
          </Form>
        </Formik>
      </div>
    </div>
  )
}

export default Signin
