/* External dependencies */
import styled, { css, keyframes } from 'styled-components'

/* Internal dependencies */
import { Shape } from './Button'

interface StyledButtonProps {
  disabled: boolean
  shape: Shape
}

export const StyledButton = styled.button<StyledButtonProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none;
  border: 0;

  ${({ shape }) =>
    shape === Shape.Circle &&
    css`
      border-radius: 50%;
    `}

  ${({ disabled }) =>
    disabled
      ? css`
          opacity: 0.7;
        `
      : css`
          cursor: pointer;
        `}
`

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

export const Rotate = styled.div`
  width: 14px;
  height: 14px;
  display: inline-block;
  animation: ${rotate} 1.1s linear infinite;
  border: solid 2px white;
  border-top-color: transparent;
  border-radius: 50%;
`
