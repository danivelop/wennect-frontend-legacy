/* External dependencies */
import styled, { css } from 'styled-components'

export interface StyledOverlayProps {
  isHidden: boolean
}

export const Container = styled.div`
  width: 100%;
  height: 100%;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
`

export const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`

export const StyledOverlay = styled.div<StyledOverlayProps>`
  position: absolute;

  ${props =>
    props.isHidden &&
    css`
      visibility: hidden;
    `}
`
