/* External dependencies */
import React from 'react'

/* Internal dependencies */
import { StyledButton, Rotate } from './Button.styled'

export enum Shape {
  Circle = 'circle',
  Square = 'square',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  shape?: Shape
  loading?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

function Button({
  className,
  shape = Shape.Square,
  loading = false,
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      className={className}
      disabled={disabled || loading}
      shape={shape}
      {...props}
    >
      {loading ? <Rotate /> : children}
    </StyledButton>
  )
}

export default Button
