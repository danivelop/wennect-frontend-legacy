/* External dependencies */
import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useHistory } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import classNames from 'classnames/bind'
import _ from 'lodash'

/* Internal dependencies */
import { enterGround, leaveGround } from 'modules/reducers/groundReducer'
import { getGround, getLocalStream } from 'modules/selectors/groundSelector'
import Button, { Shape } from 'elements/Button'
import SVGIcon, { Size } from 'elements/SVGIcon'
import styles from './Ground.module.scss'

interface GroundProps {
  roomId: string
}

const cx = classNames.bind(styles)

function Ground({ roomId }: GroundProps) {
  const dispatch = useDispatch()
  const history = useHistory()

  const ground = useSelector(getGround)
  const localStream = useSelector(getLocalStream)

  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [enableVideo, setEnableVideo] = useState(true)
  const [enableAudio, setEnableAudio] = useState(true)

  const toggleVideo = useCallback(async () => {
    if (_.isNil(ground)) return

    ground.setVideo(!enableVideo)
    setEnableVideo(prev => !prev)
  }, [ground, enableVideo])

  const toggleAudio = useCallback(() => {
    if (_.isNil(ground)) return

    ground.setAudio(!enableAudio)
    setEnableAudio(prev => !prev)
  }, [ground, enableAudio])

  const handleHangUp = useCallback(() => {
    history.goBack()
  }, [history])

  useEffect(() => {
    dispatch(enterGround({ roomId }))

    return function cleanup() {
      dispatch(leaveGround({ roomId }))
    }
  }, [roomId, dispatch])

  useEffect(() => {
    if (!_.isNil(localStream) && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  return (
    <div className={cx('ground-container')}>
      <div className={cx('ground-wrapper')}>
        <div className={cx('local-video-wrapper')}>
          <video
            ref={localVideoRef}
            className={cx('local-video')}
            autoPlay
            playsInline
          ></video>
        </div>
        <ul className={cx('option-menu')}>
          <li className={cx('item-wrapper')}>
            <Button
              className={cx('option-item', { disabled: !enableVideo })}
              shape={Shape.Circle}
              onClick={toggleVideo}
            >
              <SVGIcon name="video" size={Size.Normal} />
            </Button>
          </li>
          <li className={cx('item-wrapper')}>
            <Button
              className={cx('option-item', 'hang-up')}
              shape={Shape.Circle}
              onClick={handleHangUp}
            >
              <SVGIcon name="phone" size={Size.Normal} />
            </Button>
          </li>
          <li className={cx('item-wrapper')}>
            <Button
              className={cx('option-item', { disabled: !enableAudio })}
              shape={Shape.Circle}
              onClick={toggleAudio}
            >
              <SVGIcon name="audio" size={Size.Normal} />
            </Button>
          </li>
        </ul>
        <div className={cx('remote-video-wrapper')}>remote video</div>
      </div>
    </div>
  )
}

export default Ground
