/* External dependencies */
import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Formik, Form, Field } from 'formik'
import Immutable from 'immutable'
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
  const soundInstantsRef = useRef(Immutable.OrderedMap<string, number>())

  const [enableVideo, setEnableVideo] = useState(true)
  const [enableAudio, setEnableAudio] = useState(true)
  const [isSharing, setSharing] = useState(false)
  const [messages, setMessages] = useState(Immutable.List())

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [deviceIds, setDeviceIds] = useState<(string | undefined)[]>([])

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

  const handleShare = useCallback(async () => {
    if (_.isNil(localVideoRef.current)) {
      return
    }

    try {
      if (isSharing) {
        localVideoRef.current.srcObject = await WebRTCService.getLocalUserMediaStream(
          {
            video: true,
            audio: true,
          },
        )
      } else {
        localVideoRef.current.srcObject = await WebRTCService.getLocalDisplayMediaStream(
          { video: true },
        )
      }

      WebRTCService.setVideo(enableVideo)
      WebRTCService.setAudio(enableAudio)
      setSharing(prev => !prev)
    } catch (error) {
      alert(error)
      Error(error)
    }
  }, [enableAudio, enableVideo, isSharing])

  const handleChangeDevice = useCallback(
    async (deviceInfo: MediaDeviceInfo) => {
      try {
        if (!_.isNil(localVideoRef.current)) {
          localVideoRef.current.srcObject = await WebRTCService.changeDevice(
            deviceInfo,
          )
          setDeviceIds(WebRTCService.getDeviceIds())
        }
      } catch (error) {
        Error(error)
      }
    },
    [],
  )

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

  const handleSubmit = useCallback(
    ({ value }, { setSubmitting, resetForm }) => {
      try {
        WebRTCService.sendData(value)
        setMessages(prev => prev.push({ value }))
        resetForm()
      } catch (error) {
        Error(error)
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  const handleData = useCallback((remoteId: string, value: string) => {
    setMessages(prev => prev.push({ id: remoteId, value }))
  }, [])

  const handleSound = useCallback((remoteId: string, instant: number) => {
    soundInstantsRef.current = soundInstantsRef.current.set(remoteId, instant)
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

  const messageList = useMemo(
    () =>
      messages.map((message, index) => (
        <div key={index}>{`${message.id ?? '나'}: ${message.value}`}</div>
      )),
    [messages],
  )

  useEffect(() => {
    ;(async () => {
      try {
        if (!_.isNil(localVideoRef.current)) {
          localVideoRef.current.srcObject = await WebRTCService.getLocalUserMediaStream(
            {
              video: true,
              audio: true,
            },
          )
          WebRTCService.init({
            localVideoElement: localVideoRef.current,
            useDataChannel: true,
            useSoundMeter: true,
            dataHandler: handleData,
            soundHandler: handleSound,
          })
          WebRTCService.enter(roomId)

          if (WebRTCService.setAudio(false)) {
            setEnableAudio(false)
          }
          setDeviceIds(WebRTCService.getDeviceIds())
        }
      } catch (error) {
        Error(error)
      }
    })()

    return function cleanup() {
      WebRTCService.leave(roomId)
      WebRTCService.clear()
    }
  }, [roomId, handleData, handleSound])

  useEffect(() => {
    async function handleEnumerateDevices() {
      try {
        const {
          videoInputs,
          audioInputs,
          audioOutputs,
        } = await WebRTCService.getEnumerateDevices()

        setVideoInputs(videoInputs)
        setAudioInputs(audioInputs)
        setAudioOutputs(audioOutputs)
      } catch (error) {
        Error(error)
      }
    }

    handleEnumerateDevices()
    window.navigator.mediaDevices.addEventListener(
      'devicechange',
      handleEnumerateDevices,
    )

    return () => {
      window.navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleEnumerateDevices,
      )
    }
  }, [])

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
                  <SVGIcon name="video" size={Size.XSmall} />
                </Button>
              </li>
              <li className={cx('item-wrapper')}>
                <Button
                  className={cx('option-item', 'hang-up')}
                  shape={Shape.Circle}
                  onClick={handleHangUp}
                >
                  <SVGIcon name="phone" size={Size.XSmall} />
                </Button>
              </li>
              <li className={cx('item-wrapper')}>
                <Button
                  className={cx('option-item', { disabled: !enableAudio })}
                  shape={Shape.Circle}
                  onClick={toggleAudio}
                >
                  <SVGIcon name="audio" size={Size.XSmall} />
                </Button>
              </li>
              <li className={cx('item-wrapper')}>
                <Button
                  className={cx('option-item', { isSharing: isSharing })}
                  shape={Shape.Circle}
                  onClick={handleShare}
                >
                  <SVGIcon name="share" size={Size.XSmall} />
                </Button>
              </li>
            </ul>
          </div>
          <div className={cx('remote-video-wrapper')}>{remoteVideos}</div>
        </div>
        <div className={cx('option-area')}>
          <div className={cx('chat-area')}>
            <div className={cx('messenger-stream')}>{messageList}</div>
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
                        autoComplete="off"
                      />
                      <Button
                        className={cx('submit-button')}
                        disabled={!dirty}
                        loading={isSubmitting}
                        type="submit"
                      >
                        Send
                      </Button>
                    </Form>
                  </>
                )}
              </Formik>
            </div>
          </div>
          <div className={cx('devices-area')}>
            <div className={cx('device-list')}>
              <h3 className={cx('device-list-title')}>video input</h3>
              {videoInputs.map(deviceInfo => (
                <div
                  key={deviceInfo.deviceId}
                  className={cx('device-item', {
                    selected: deviceIds.includes(deviceInfo.deviceId),
                  })}
                  onClick={() => handleChangeDevice(deviceInfo)}
                >
                  label: {deviceInfo.label}
                </div>
              ))}
            </div>
            <div className={cx('device-list')}>
              <h3 className={cx('device-list-title')}>audio input</h3>
              {audioInputs.map(deviceInfo => (
                <div
                  key={deviceInfo.deviceId}
                  className={cx('device-item', {
                    selected: deviceIds.includes(deviceInfo.deviceId),
                  })}
                  onClick={() => handleChangeDevice(deviceInfo)}
                >
                  label: {deviceInfo.label}
                </div>
              ))}
            </div>
            <div className={cx('device-list')}>
              <h3 className={cx('device-list-title')}>audio output</h3>
              {audioOutputs.map(deviceInfo => (
                <div
                  key={deviceInfo.deviceId}
                  className={cx('device-item', {
                    selected: deviceIds.includes(deviceInfo.deviceId),
                  })}
                  onClick={() => handleChangeDevice(deviceInfo)}
                >
                  label: {deviceInfo.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ground
