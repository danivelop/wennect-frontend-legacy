/* External dependencies */
import React from 'react'
import { useParams } from 'react-router-dom'

/* Internal dependencies */
import Ground from 'components/Ground'

interface ParamsProps {
  roomId: string
}

function GroundPage() {
  const { roomId } = useParams<ParamsProps>()

  return <Ground roomId={roomId} />
}

export default GroundPage
