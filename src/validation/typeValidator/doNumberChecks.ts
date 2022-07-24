import { SimpleSchema } from '../../SimpleSchema.js'
import { SchemaKeyDefinition } from '../../types.js'

export default function doNumberChecks (
  def: SchemaKeyDefinition,
  keyValue: number,
  op: string | null,
  expectsInteger: boolean
) {
  // Is it a valid number?
  if (typeof keyValue !== 'number' || isNaN(keyValue)) {
    return {
      type: SimpleSchema.ErrorTypes.EXPECTED_TYPE,
      dataType: expectsInteger ? 'Integer' : 'Number'
    }
  }

  // Assuming we are not incrementing, is the value less than the maximum value?
  if (
    op !== '$inc' &&
    def.max !== null &&
    (def.exclusiveMax === true
      ? (def.max as number) <= keyValue
      : (def.max as number) < keyValue)
  ) {
    return {
      type: def.exclusiveMax === true
        ? SimpleSchema.ErrorTypes.MAX_NUMBER_EXCLUSIVE
        : SimpleSchema.ErrorTypes.MAX_NUMBER,
      max: def.max
    }
  }

  // Assuming we are not incrementing, is the value more than the minimum value?
  if (
    op !== '$inc' &&
    def.min !== null &&
    (def.exclusiveMin === true
      ? (def.min as number) >= keyValue
      : (def.min as number) > keyValue)
  ) {
    return {
      type: def.exclusiveMin === true
        ? SimpleSchema.ErrorTypes.MIN_NUMBER_EXCLUSIVE
        : SimpleSchema.ErrorTypes.MIN_NUMBER,
      min: def.min
    }
  }

  // Is it an integer if we expect an integer?
  if (expectsInteger && !Number.isInteger(keyValue)) {
    return { type: SimpleSchema.ErrorTypes.MUST_BE_INTEGER }
  }
}
