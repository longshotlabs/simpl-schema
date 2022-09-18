import { SimpleSchema } from '../../SimpleSchema.js'
import { SchemaKeyDefinition, ValidationErrorResult } from '../../types.js'

export default function checkArrayValue (
  def: SchemaKeyDefinition,
  value: unknown[]
): ValidationErrorResult | undefined {
  // Is it an array?
  if (!Array.isArray(value)) {
    return { type: SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Array' }
  }

  // Are there fewer than the minimum number of items in the array?
  if (def.minCount != null && value.length < def.minCount) {
    return { type: SimpleSchema.ErrorTypes.MIN_COUNT, minCount: def.minCount }
  }

  // Are there more than the maximum number of items in the array?
  if (def.maxCount != null && value.length > def.maxCount) {
    return { type: SimpleSchema.ErrorTypes.MAX_COUNT, maxCount: def.maxCount }
  }
}
