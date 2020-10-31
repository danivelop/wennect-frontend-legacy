/* External dependencies */
import React, { useState, useCallback, useRef } from 'react'
import classNames from 'classnames/bind'

/* Internal dependencies */
import styles from './SearchInput.module.scss'

const cx = classNames.bind(styles)

function SearchInput() {
  const inputWrapperRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState<string>('')
  const [isFocus, setIsFocus] = useState<boolean>(false)

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target
      setQuery(value)
    },
    [],
  )

  const handleFocus = useCallback(() => {
    setIsFocus(true)
    if (inputWrapperRef.current) {
      inputWrapperRef.current.style.backgroundColor = '#f1f3f5'
    }
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocus(false)
    setTimeout(() => {
      if (inputWrapperRef.current) {
        inputWrapperRef.current.style.backgroundColor = 'unset'
      }
    }, 200)
  }, [])

  return (
    <div
      className={cx('search-input-wrapper', { isFocus })}
      ref={inputWrapperRef}
    >
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
