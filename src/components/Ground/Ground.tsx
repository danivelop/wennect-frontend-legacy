/* External dependencies */
import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Formik, Form, Field } from 'formik'
import classNames from 'classnames/bind'
import _ from 'lodash'

/* Internal dependencies */
import { getPeerConnections } from 'modules/selectors/groundSelector'
import WebRTCService from 'services/WebRTCService'
import Button, { Shape } from 'elements/Button'
import SVGIcon, { Size } from 'elements/SVGIcon'
import { Error } from 'utils/consoleUtils'
import styles from './Ground.module.scss'

interface GroundProps {
  roomId: string
}

const cx = classNames.bind(styles)

function Ground({ roomId }: GroundProps) {
  const history = useHistory()
  const peerConnections = useSelector(getPeerConnections)

  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [enableVideo, setEnableVideo] = useState(true)
  const [enableAudio, setEnableAudio] = useState(true)

  const toggleVideo = useCallback(async () => {
    if (WebRTCService.setVideo(!enableVideo)) {
      setEnableVideo(prev => !prev)
    }
  }, [enableVideo])

  const toggleAudio = useCallback(() => {
    if (WebRTCService.setAudio(!enableAudio)) {
      setEnableAudio(prev => !prev)
    }
  }, [enableAudio])

  const handleHangUp = useCallback(() => {
    history.goBack()
  }, [history])

  const handleInsertRemoteStream = useCallback(
    (
      remoteVideo: HTMLVideoElement | null,
      remoteStream: MediaStream | null,
    ) => {
      if (remoteVideo) {
        remoteVideo.srcObject = remoteStream
      }
    },
    [],
  )

  const handleSubmit = useCallback(({ value }, { setSubmitting }) => {
    try {
    } catch (error) {
      Error(error)
    }
  }, [])

  const remoteVideos = useMemo(() => {
    return peerConnections.map(pc => (
      <video
        key={pc.remoteId}
        className={cx('remote-video')}
        ref={ref => handleInsertRemoteStream(ref, pc.remoteStream)}
        autoPlay
        playsInline
      ></video>
    ))
  }, [peerConnections, handleInsertRemoteStream])

  useEffect(() => {
    ;(async () => {
      try {
        if (!_.isNil(localVideoRef.current)) {
          localVideoRef.current.srcObject = await WebRTCService.getLocalMediaStream(
            {
              video: true,
              audio: true,
            },
          )
          WebRTCService.init()
          WebRTCService.enter(roomId)

          if (WebRTCService.setAudio(false)) {
            setEnableAudio(false)
          }
        }
      } catch (error) {
        Error(error)
      }
    })()

    return function cleanup() {
      WebRTCService.leave(roomId)
      WebRTCService.hangUp()
    }
  }, [roomId])

  const formikConfig = useRef({
    initialValues: {
      value: '',
    },
    onSubmit: handleSubmit,
  })

  return (
    <div className={cx('ground-container')}>
      <div className={cx('ground-wrapper')}>
        <div className={cx('video-area')}>
          <div className={cx('local-video-wrapper')}>
            <video
              ref={localVideoRef}
              className={cx('local-video')}
              autoPlay
              playsInline
              muted
            ></video>
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
          </div>
          <div className={cx('remote-video-wrapper')}>{remoteVideos}</div>
        </div>
        <div className={cx('chat-area')}>
          <div className={cx('messenger-stream')}></div>
          <div className={cx('message-input-wrapper')}>
            <Formik {...formikConfig.current}>
              {({ dirty, isSubmitting }) => (
                <>
                  <Form className={cx('message-form')}>
                    <Field
                      className={cx('message-input')}
                      name="value"
                      type="text"
                      placeholder=""
                    />
                    <Button
                      className={cx('submit-button')}
                      disabled={!dirty}
                      loading={isSubmitting}
                      type="submit"
                    >
                      보내기
                    </Button>
                  </Form>
                </>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ground
