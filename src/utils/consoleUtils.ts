/* External dependencies */
import _ from 'lodash'

/* Internal dependencies */
import { isProduction } from 'utils/environmentUtils'

export function Log(...args: any[]) {
  if (!isProduction()) {
    console.log(...args)
  }
}

export function Info(...args: any[]) {
  if (!isProduction()) {
    if (_.isFunction(console.info)) {
      console.info(...args)
    } else {
      console.log(...args)
    }
  }
}

export function Warn(...args: any[]) {
  if (!isProduction()) {
    if (_.isFunction(console.warn)) {
      console.warn(...args)
    } else {
      console.log(...args)
    }
  }
}

export function Error(...args: any[]) {
  if (!isProduction()) {
    if (_.isFunction(console.error)) {
      console.error(...args)
    } else {
      console.log(...args)
    }
  }
}
