import { SimpleSchema } from '../SimpleSchema.js'
import { SupportedTypes } from '../types.js'

/**
 * Converts value to proper type
 *
 * @param value Value to try to convert
 * @param type A type
 * @returns Value converted to type.
 */
export default function convertToProperType (value: any, type: SupportedTypes): any {
  // Can't and shouldn't convert arrays or objects or null
  if (value === null) return value
  if (value === undefined) return value
  if (Array.isArray(value)) return value
  if (
    value !== undefined &&
    (typeof value === 'function' || typeof value === 'object') &&
    !(value instanceof Date)
  ) return value

  // Convert to String type
  if (type === String) return value.toString()

  // Convert to Number type
  if (type === Number || type === SimpleSchema.Integer) {
    if (typeof value === 'string' && value.length > 0) {
      // Try to convert numeric strings to numbers
      const numberVal = Number(value)
      if (!isNaN(numberVal)) return numberVal
    }
    // Leave it; will fail validation
    return value
  }

  // If target type is a Date we can safely convert from either a
  // number (Integer value representing the number of milliseconds
  // since 1 January 1970 00:00:00 UTC) or a string that can be parsed
  // by Date.
  if (type === Date) {
    if (typeof value === 'string') {
      const parsedDate = Date.parse(value)
      if (!isNaN(parsedDate)) return new Date(parsedDate)
    }
    if (typeof value === 'number') return new Date(value)
  }

  // Convert to Boolean type
  if (type === Boolean) {
    if (typeof value === 'string') {
      // Convert exact string 'true' and 'false' to true and false respectively
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
    } else if (typeof value === 'number' && !isNaN(value)) {
      // NaN can be error, so skipping it
      return Boolean(value)
    }
  }

  // If an array is what you want, I'll give you an array
  if (type === Array) return [value]

  // Could not convert
  return value
}
