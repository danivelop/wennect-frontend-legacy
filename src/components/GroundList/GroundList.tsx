/* External dependencies */
import React, { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import classNames from 'classnames/bind'

/* Internal dependencies */
import styles from './GroundList.module.scss'

const cx = classNames.bind(styles)

function GroundList() {
  const history = useHistory()

  const handleCreateRoom = useCallback(() => {
    history.push('/1')
  }, [history])

  return (
    <div className={cx('ground-list-wrapper')}>
      <div className={cx('btn')} onClick={handleCreateRoom}>
        방만들기
      </div>
    </div>
  )
}

export default GroundList
