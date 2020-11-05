/* External dependencies */
import React from 'react'
import classNames from 'classnames/bind'

/* Internal dependencies */
import styles from './RoomList.module.scss'

const cx = classNames.bind(styles)

function RoomList() {
  return <div className={cx('room-list-wrapper')}>roomlist</div>
}

export default RoomList
