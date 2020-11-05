/* External dependencies */
import { useCallback, useState } from 'react'

function useIsShow(initialValue = false): [boolean, () => void, () => void] {
  const [isShow, setIsShow] = useState(initialValue)
  const show = useCallback(() => setIsShow(true), [])
  const hide = useCallback(() => setIsShow(false), [])
  return [isShow, show, hide]
}

export default useIsShow
