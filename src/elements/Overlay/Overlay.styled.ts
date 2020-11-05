/* External dependencies */
import styled, { css } from 'styled-components'

export interface StyledOverlayProps {
  isHidden: boolean
}

export const Container = styled.div`
  bottom: 0;
  height: 100%;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  width: 100%;
`

export const Wrapper = styled.div`
  height: 100%;
  position: relative;
  width: 100%;
`

export const StyledOverlay = styled.div<StyledOverlayProps>`
  ${props =>
    props.isHidden &&
    css`
      visibility: hidden;
    `}
  position: absolute;
`
