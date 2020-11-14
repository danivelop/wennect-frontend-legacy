/* External dependencies */
import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useHistory } from 'react-router-dom'
import classNames from 'classnames/bind'

/* Internal dependencies */
import WebRTC from 'services/WebRTCService'
import Button, { Shape } from 'elements/Button'
import SVGIcon, { Size } from 'elements/SVGIcon'
import styles from './Ground.module.scss'

interface GroundProps {
  roomId: string
}

const cx = classNames.bind(styles)

function Ground({ roomId }: GroundProps) {
  const history = useHistory()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const webRTC = useRef<WebRTC>()

  const [enableVideo, setEnableVideo] = useState(true)
  const [enableAudio, setEnableAudio] = useState(true)

  const toggleVideo = useCallback(async () => {
    webRTC.current?.setVideo(!enableVideo)
    setEnableVideo(prev => !prev)
  }, [enableVideo])

  const toggleAudio = useCallback(() => {
    webRTC.current?.setAudio(!enableAudio)
    setEnableAudio(prev => !prev)
  }, [enableAudio])

  const handleHangUp = useCallback(() => {
    webRTC.current?.hangUp()
    webRTC.current = undefined
    history.goBack()
  }, [history])

  useEffect(() => {
    ;(async () => {
      try {
        webRTC.current = new WebRTC({
          videoElement: localVideoRef.current,
          enableVideo: true,
          enableAudio: true,
        })
        await webRTC.current.getLocalMediaStream()
      } catch (error) {
        console.error(error)
      }
    })()

    return function cleanUp() {
      webRTC.current?.hangUp()
      webRTC.current = undefined
    }
  }, [handleHangUp])

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
