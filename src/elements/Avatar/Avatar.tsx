/* External dependencies */
import React from 'react'

/* Internal dependencies */
import { StyledAvatar, AvatarImage } from './Avatar.styled'

interface AvatarProps {
  className?: string
  width?: number
  height?: number
  src: string
}

function Avatar({ className = '', width = 30, height = 30, src }: AvatarProps) {
  return (
    <StyledAvatar className={className} width={width} height={height}>
      <AvatarImage src={src} />
    </StyledAvatar>
  )
}

export default Avatar
