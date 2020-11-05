/* External dependencies */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'

/* Internal dependencies */
import OverlayPosition from './OverlayPosition'
import { Container, Wrapper, StyledOverlay } from './Overlay.styled'

interface OverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: boolean
  className?: string
  style?: React.CSSProperties
  containerClassName?: string
  containerStyle?: React.CSSProperties
  container?: HTMLElement
  target: HTMLElement | null
  placement?: OverlayPosition
  repositionOverflow?: boolean
  marginX?: number
  marginY?: number
  children: React.ReactNode
  onHide?: () => void
}

interface GetOverlayStyleProps {
  container?: HTMLElement
  target: HTMLElement | null
  overlay: HTMLElement
  placement: OverlayPosition
  repositionOverflow: boolean
  marginX: number
  marginY: number
}

interface GetOverlayPositionProps {
  container?: HTMLElement
  target: HTMLElement
}

interface GetOverlayTranslationProps {
  container?: HTMLElement
  target: HTMLElement
  overlay: HTMLElement
  placement: OverlayPosition
  repositionOverflow: boolean
  marginX: number
  marginY: number
}

type EventHandler<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
) => any

const ESCAPE_KEY = 'Escape'
const rootElement =
  document.getElementById('main') ||
  document.getElementById('root') ||
  (document.getElementsByTagName('body')[0] as HTMLElement)

function listen<K extends keyof HTMLElementEventMap>(
  element: any,
  eventName: K,
  handler: EventHandler<K>,
) {
  if (!element) return _.noop

  element.addEventListener(eventName, handler)
  return function cleanup() {
    element.removeEventListener(eventName, handler)
  }
}

function getOverlayPosition({
  container,
  target,
}: GetOverlayPositionProps): React.CSSProperties {
  if (target) {
    const { top: targetTop, left: targetLeft } = target.getBoundingClientRect()

    const top = container
      ? targetTop -
        target.clientTop -
        container.getBoundingClientRect().top +
        container.scrollTop
      : targetTop - target.clientTop
    const left = container
      ? targetLeft -
        target.clientLeft -
        container.getBoundingClientRect().left +
        container.scrollLeft
      : targetLeft - target.clientLeft

    return { top, left }
  }
  return {}
}

function getOverlayTranslation({
  container,
  target,
  overlay,
  placement,
  repositionOverflow,
  marginX,
  marginY,
}: GetOverlayTranslationProps): React.CSSProperties {
  if (target) {
    const containerElement = container || (rootElement as HTMLElement)
    const {
      width: rootWidth,
      height: rootHeight,
      top: rootTop,
      left: rootLeft,
    } = containerElement.getBoundingClientRect()
    const {
      width: targetWidth,
      height: targetHeight,
      top: targetTop,
      left: targetLeft,
    } = target.getBoundingClientRect()
    const {
      width: overlayWidth,
      height: overlayHeight,
    } = overlay.getBoundingClientRect()

    let translateX = 0
    let translateY = 0

    switch (placement) {
      case OverlayPosition.TopCenter:
      case OverlayPosition.TopLeft:
      case OverlayPosition.TopRight:
        translateY -= overlayHeight + marginY
        translateX += marginX
        break
      case OverlayPosition.RightCenter:
      case OverlayPosition.RightTop:
      case OverlayPosition.RightBottom:
        translateX += targetWidth + marginX
        translateY += marginY
        break
      case OverlayPosition.BottomCenter:
      case OverlayPosition.BottomLeft:
      case OverlayPosition.BottomRight:
        translateY += targetHeight + marginY
        translateX += marginX
        break
      case OverlayPosition.LeftCenter:
      case OverlayPosition.LeftTop:
      case OverlayPosition.LeftBottom:
        translateX -= overlayWidth + marginX
        translateY += marginY
        break
    }

    switch (placement) {
      case OverlayPosition.TopCenter:
      case OverlayPosition.BottomCenter:
        translateX -= overlayWidth / 2 - targetWidth / 2
        break
      case OverlayPosition.TopRight:
      case OverlayPosition.BottomRight:
        translateX -= overlayWidth - targetWidth
        break
      case OverlayPosition.RightCenter:
      case OverlayPosition.LeftCenter:
        translateY -= overlayHeight / 2 - targetHeight / 2
        break
      case OverlayPosition.RightBottom:
      case OverlayPosition.LeftBottom:
        translateY -= overlayHeight - targetHeight
        break
    }

    if (repositionOverflow) {
      const isOverTop = targetTop + translateY < rootTop
      const isOverBottom =
        targetTop + translateY + overlayHeight > rootTop + rootHeight
      const isOverLeft = targetLeft + translateX < rootLeft
      const isOverRight =
        targetLeft + translateX + overlayWidth > rootLeft + rootWidth

      if (isOverTop || isOverBottom) {
        translateY = targetHeight - translateY - overlayHeight
      }
      if (isOverLeft || isOverRight) {
        translateX = targetWidth - translateX - overlayWidth
      }
    }

    const transform = `translate(${translateX}px, ${translateY}px)`
    return { transform }
  }
  return {}
}

function getOverlayStyle({
  container,
  target,
  overlay,
  placement,
  repositionOverflow,
  marginX,
  marginY,
}: GetOverlayStyleProps): React.CSSProperties {
  if (target) {
    const overlayPositionStyle = getOverlayPosition({ container, target })
    const overlayTranslateStyle = getOverlayTranslation({
      container,
      target,
      overlay,
      placement,
      repositionOverflow,
      marginX,
      marginY,
    })

    const combinedStyle = {
      ...overlayPositionStyle,
      ...overlayTranslateStyle,
      willChange: 'left, top',
    }

    return combinedStyle
  }
  return {}
}

function Overlay({
  show = false,
  className = '',
  style,
  containerClassName = '',
  containerStyle,
  container,
  target,
  placement = OverlayPosition.LeftCenter,
  repositionOverflow = false,
  marginX = 0,
  marginY = 0,
  children,
  onHide = _.noop,
  ...otherProps
}: OverlayProps) {
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>()
  const [isHidden, setIsHidden] = useState<boolean>(true)
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleBlockMouseWheel = useCallback(
    (event: HTMLElementEventMap['wheel']) => {
      event.stopPropagation()
    },
    [],
  )

  const handleHideOverlay = useCallback(
    (event: any) => {
      if (!event.target?.closest(StyledOverlay)) {
        onHide()
      }
    },
    [onHide],
  )

  const handleClickTarget = useCallback(
    (event: HTMLElementEventMap['click']) => {
      onHide()
      event.stopPropagation()
    },
    [onHide],
  )

  const handleKeydown = useCallback(
    (event: HTMLElementEventMap['keyup']) => {
      if (event.key === ESCAPE_KEY) {
        onHide()
      }
    },
    [onHide],
  )

  const overlay = useMemo(() => {
    if (container) {
      return (
        <StyledOverlay
          className={className}
          isHidden={isHidden}
          style={{
            ...(style || {}),
            ...(overlayStyle || {}),
          }}
          ref={overlayRef}
          {...otherProps}
        >
          {children}
        </StyledOverlay>
      )
    }
    return (
      <Container
        ref={containerRef}
        className={containerClassName}
        style={containerStyle}
      >
        <Wrapper>
          <StyledOverlay
            className={className}
            isHidden={isHidden}
            style={{
              ...(style || {}),
              ...(overlayStyle || {}),
            }}
            ref={overlayRef}
            {...otherProps}
          >
            {children}
          </StyledOverlay>
        </Wrapper>
      </Container>
    )
  }, [
    container,
    className,
    style,
    containerClassName,
    containerStyle,
    isHidden,
    overlayStyle,
    children,
    overlayRef,
    otherProps,
  ])

  useEffect(() => {
    if (show) {
      const removeDocumentClickListener = listen(
        document,
        'click',
        handleHideOverlay,
      )
      const removeDocumentKeyupListener = listen(
        document,
        'keyup',
        handleKeydown,
      )
      const removeTargetClickListener = listen(
        target,
        'click',
        handleClickTarget,
      )
      const remoteContainerWheelListener = listen(
        containerRef.current,
        'wheel',
        handleBlockMouseWheel,
      )

      return () => {
        removeDocumentClickListener()
        removeDocumentKeyupListener()
        removeTargetClickListener()
        remoteContainerWheelListener()
      }
    }
    return _.noop
  }, [
    show,
    target,
    handleHideOverlay,
    handleKeydown,
    handleClickTarget,
    handleBlockMouseWheel,
  ])

  useEffect(() => {
    if (show) {
      const tempOverlayStyle = getOverlayStyle({
        container,
        target,
        overlay: overlayRef.current as HTMLElement,
        placement,
        repositionOverflow,
        marginX,
        marginY,
      })
      setOverlayStyle(tempOverlayStyle)
      setIsHidden(false)

      return () => {
        setOverlayStyle(undefined)
        setIsHidden(true)
      }
    }
    return _.noop
  }, [show, container, marginX, marginY, placement, repositionOverflow, target])

  if (!show) return null

  return ReactDOM.createPortal(
    overlay,
    container || (rootElement as HTMLElement),
  )
}

export default Overlay
