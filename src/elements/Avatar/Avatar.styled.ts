/* External dependencies */
import styled from 'styled-components'

interface StyledAvatarProps {
  height: number
  width: number
}

export const StyledAvatar = styled.div<StyledAvatarProps>`
  height: ${props => props.height}px;
  width: ${props => props.width}px;
`

export const AvatarImage = styled.img`
  height: 100%;
  width: 100%;
`
