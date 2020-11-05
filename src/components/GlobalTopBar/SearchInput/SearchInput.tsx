/* External dependencies */
import React, { useState, useCallback } from 'react'
import classNames from 'classnames/bind'

/* Internal dependencies */
import styles from './SearchInput.module.scss'

const cx = classNames.bind(styles)

const INPUT__DURATION = 200

function SearchInput() {
  const [query, setQuery] = useState<string>('')
  const [isFocus, setIsFocus] = useState<boolean>(false)
  const [overInterval, setOverInterval] = useState<boolean>(false)

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target
      setQuery(value)
    },
    [],
  )

  const handleFocus = useCallback(() => {
    setIsFocus(true)
    setOverInterval(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocus(false)
    setTimeout(() => {
      setOverInterval(false)
    }, INPUT__DURATION)
  }, [])

  return (
    <div className={cx('search-input-wrapper', { isFocus, overInterval })}>
      <input
        className={cx('search-input')}
        type="text"
        value={query}
        onChange={handleChangeInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="search"
      />
    </div>
  )
}

export default SearchInput
