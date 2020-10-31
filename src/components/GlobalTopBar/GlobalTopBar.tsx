/* External dependencies */
import React from 'react'
import classNames from 'classnames/bind'

/* Internal dependencies */
import SearchInput from 'components/GlobalTopBar/SearchInput'
import styles from './GlobalTopBar.module.scss'

const cx = classNames.bind(styles)

function GlobalTopBar() {
  return (
    <div className={cx('topbar-wrapper')}>
      <SearchInput />
    </div>
  )
}

export default GlobalTopBar
