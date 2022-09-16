import { ObjectToValidate } from '../types.js'

/**
 * Returns true if any of the keys of obj start with a $
 */
export default function looksLikeModifier (
  obj: ObjectToValidate | null | undefined
): boolean {
  return Object.keys(obj ?? {}).some((key) => key.substring(0, 1) === '$')
}
