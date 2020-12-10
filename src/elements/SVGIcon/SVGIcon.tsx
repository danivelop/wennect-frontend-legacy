/* External dependencies */
import React, { useMemo } from 'react'
import _ from 'lodash'

/* Internal dependencies */
import { Error } from 'utils/consoleUtils'
import * as Styled from './SVGIcon.styled'

export enum Size {
  XXSmall = 12,
  XSmall = 16,
  Small = 20,
  Normal = 24,
  Large = 34,
}

interface SVGIconProps {
  className?: string
  name: string
  size?: Size
}

function SVGIcon({ className, name, size = Size.Normal }: SVGIconProps) {
  const src = useMemo(() => {
    const fileName = _.endsWith(name, '.svg') ? name : `${name}.svg`
    try {
      return require(`assets/icons/${fileName}`)
    } catch (e) {
      Error(
        `cannot find icon name ${name}. Pleace check again. error message : ${e.message}`,
      )
    }
  }, [name])

  return (
    <Styled.SVGIconWrapper className={className} size={size}>
      <Styled.SVGIcon src={src?.default} />
    </Styled.SVGIconWrapper>
  )
}

export default SVGIcon
