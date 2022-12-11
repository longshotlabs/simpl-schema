import { ObjectToValidate } from '../types.js'

export function appendAffectedKey (affectedKey: string | undefined, key: string): string | undefined {
  if (key === '$each') return affectedKey
  return affectedKey == null ? key : `${affectedKey}.${key}`
}

/**
 * Given a Date instance, returns a date string of the format YYYY-MM-DD
 */
export function dateToDateString (date: Date): string {
  let month: number | string = date.getUTCMonth() + 1
  if (month < 10) month = `0${month}`
  let day: number | string = date.getUTCDate()
  if (day < 10) day = `0${day}`
  return `${date.getUTCFullYear()}-${month}-${day}`
}

/**
 * Run loopFunc for each ancestor key in a dot-delimited key. For example,
 * if key is "a.b.c", loopFunc will be called first with ('a.b', 'c') and then with ('a', 'b.c')
 */
export function forEachKeyAncestor (
  key: string,
  loopFunc: (ancestor: string, remainder: string) => void
): void {
  let lastDot

  // Iterate the dot-syntax hierarchy
  let ancestor = key
  do {
    lastDot = ancestor.lastIndexOf('.')
    if (lastDot !== -1) {
      ancestor = ancestor.slice(0, lastDot)
      const remainder = key.slice(ancestor.length + 1)
      loopFunc(ancestor, remainder) // Remove last path component
    }
  } while (lastDot !== -1)
}

/**
 * Returns an array of keys that are in obj, have a value
 * other than null or undefined, and start with matchKey
 * plus a dot.
 */
export function getKeysWithValueInObj (
  obj: Record<string, unknown>,
  matchKey: string
): string[] {
  const keysWithValue: string[] = []

  const keyAdjust = (key: string): string => key.slice(0, matchKey.length + 1)
  const matchKeyPlusDot = `${matchKey}.`

  Object.keys(obj ?? {}).forEach((key) => {
    const val = obj[key]
    if (val === undefined || val === null) return
    if (keyAdjust(key) === matchKeyPlusDot) {
      keysWithValue.push(key)
    }
  })

  return keysWithValue
}

/**
 * Returns the ending of key, after stripping out the beginning
 * ancestorKey and any array placeholders
 *
 * getLastPartOfKey('a.b.c', 'a') returns 'b.c'
 * getLastPartOfKey('a.b.$.c', 'a.b') returns 'c'
 */
export function getLastPartOfKey (key: string, ancestorKey: string): string {
  let lastPart = ''
  const startString = `${ancestorKey}.`
  if (key.indexOf(startString) === 0) {
    lastPart = key.replace(startString, '')
    if (lastPart.startsWith('$.')) lastPart = lastPart.slice(2)
  }
  return lastPart
}

/**
 * Returns the parent of a key. For example, returns 'a.b' when passed 'a.b.c'.
 * If no parent, returns an empty string. If withEndDot is true, the return
 * value will have a dot appended when it isn't an empty string.
 */
export function getParentOfKey (key: string, withEndDot = false): string {
  const lastDot = key.lastIndexOf('.')
  return lastDot === -1 ? '' : key.slice(0, lastDot + Number(withEndDot))
}

/**
 * @summary Determines whether the object has any "own" properties
 * @param {Object} obj Object to test
 * @return {Boolean} True if it has no "own" properties
 */
export function isEmptyObject (obj: Record<string, unknown>): boolean {
  /* eslint-disable no-restricted-syntax */
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false
    }
  }
  /* eslint-enable no-restricted-syntax */

  return true
}

export function isObjectWeShouldTraverse (val: any): boolean {
  // Some of these types don't exist in old browsers so we'll catch and return false in those cases
  try {
    if (val !== Object(val)) return false
    // There are some object types that we know we shouldn't traverse because
    // they will often result in overflows and it makes no sense to validate them.
    if (val instanceof Date) return false
    if (val instanceof Int8Array) return false
    if (val instanceof Uint8Array) return false
    if (val instanceof Uint8ClampedArray) return false
    if (val instanceof Int16Array) return false
    if (val instanceof Uint16Array) return false
    if (val instanceof Int32Array) return false
    if (val instanceof Uint32Array) return false
    if (val instanceof Float32Array) return false
    if (val instanceof Float64Array) return false
  } catch (e) {
    return false
  }

  return true
}

/**
 * Returns true if any of the keys of obj start with a $
 */
export function looksLikeModifier (
  obj: ObjectToValidate | null | undefined
): boolean {
  return Object.keys(obj ?? {}).some((key) => key.substring(0, 1) === '$')
}

export { humanize } from './humanize.js'
