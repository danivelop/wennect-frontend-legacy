/* External dependencies */
import React, { useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import classNames from 'classnames/bind'

/* Internal dependencies */
import * as authSelector from 'modules/selectors/authSelector'
import { signout, getLoggedIn } from 'modules/reducers/authReducer'
import useIsShow from 'hooks/useIsShow'
import SearchInput from 'components/GlobalTopBar/SearchInput'
import Avatar from 'elements/Avatar'
import Overlay from 'elements/Overlay'
import OverlayPosition from 'elements/Overlay/OverlayPosition'
import styles from './GlobalTopBar.module.scss'
import defaultAvatar from 'assets/images/default-avatar.png'

const cx = classNames.bind(styles)

function GlobalTopBar() {
  const dispatch = useDispatch()
  const location = useLocation()
  const targetRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = useSelector(authSelector.isLoggedIn)

  const [show, handleShowOverlay, handleHideOverlay] = useIsShow(false)

  const handleLogout = useCallback(() => {
    dispatch(signout())
    handleHideOverlay()
  }, [dispatch, handleHideOverlay])

  useEffect(() => {
    dispatch(getLoggedIn())
  }, [dispatch])

  useEffect(() => {
    handleHideOverlay()
  }, [location.pathname, handleHideOverlay])

  return (
    <div className={cx('topbar-wrapper')}>
      <SearchInput />
      <div ref={targetRef} className={cx('avatar')} onClick={handleShowOverlay}>
        <Avatar src={defaultAvatar} />
      </div>
      <Overlay
        target={targetRef.current}
        show={show}
        placement={OverlayPosition.BottomRight}
        marginX={16}
        marginY={10}
        onHide={handleHideOverlay}
      >
        <div className={cx('overlay')}>
          <ul>
            {isLoggedIn ? (
              <li
                className={cx('global-menu-item', 'signin')}
                onClick={handleLogout}
              >
                Sign out
              </li>
            ) : (
              <>
                <Link to="/signin">
                  <li className={cx('global-menu-item', 'signin')}>Sign in</li>
                </Link>
                <Link to="/signup">
                  <li className={cx('global-menu-item', 'signup')}>Sign up</li>
                </Link>
              </>
            )}
            <li className={cx('global-menu-item', 'setting')}>Setting</li>
          </ul>
        </div>
      </Overlay>
    </div>
  )
}

export default GlobalTopBar
