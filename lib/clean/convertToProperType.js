import { SimpleSchema } from '../SimpleSchema';

/**
 * Converts value to proper type
 *
 * @param {Any} value Value to try to convert
 * @param {Any} type  A type
 * @returns {Any} Value converted to type.
 */
function convertToProperType(value, type) {
  // Can't and shouldn't convert arrays or objects
  if (
    Array.isArray(value) ||
    (value && (typeof value === 'function' || typeof value === 'object') && !(value instanceof Date))
  ) return value;

  // Convert to String type
  if (type === String) {
    if (value === null || value === undefined) return value;
    return value.toString();
  }

  // Convert to Number type
  if (type === Number || type === SimpleSchema.Integer) {
    if (typeof value === 'string' && value.length > 0) {
      // Try to convert numeric strings to numbers
      const numberVal = Number(value);
      if (!isNaN(numberVal)) return numberVal;
    }
    // Leave it; will fail validation
    return value;
  }

  // If target type is a Date we can safely convert from either a
  // number (Integer value representing the number of milliseconds
  // since 1 January 1970 00:00:00 UTC) or a string that can be parsed
  // by Date.
  if (type === Date) {
    if (typeof value === 'string') {
      const parsedDate = Date.parse(value);
      if (isNaN(parsedDate) === false) return new Date(parsedDate);
    }
    if (typeof value === 'number') return new Date(value);
  }

  // If an array is what you want, I'll give you an array
  if (type === Array) return [value];

  // Could not convert
  return value;
}

export default convertToProperType;
