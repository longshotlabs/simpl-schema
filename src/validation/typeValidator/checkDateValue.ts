import { SimpleSchema } from '../../SimpleSchema.js'
import { SchemaKeyDefinition, ValidationErrorResult } from '../../types.js'
import { dateToDateString } from '../../utility/index.js'

export default function checkDateValue (def: SchemaKeyDefinition, value: Date): ValidationErrorResult | undefined {
  // Is it an invalid date?
  if (isNaN(value.getTime())) { return { type: SimpleSchema.ErrorTypes.BAD_DATE } }

  // Is it earlier than the minimum date?
  if (
    def.min !== undefined &&
    typeof (def.min as Date).getTime === 'function' &&
    (def.min as Date).getTime() > value.getTime()
  ) {
    return {
      type: SimpleSchema.ErrorTypes.MIN_DATE,
      min: dateToDateString(def.min as Date)
    }
  }

  // Is it later than the maximum date?
  if (
    def.max !== undefined &&
    typeof (def.max as Date).getTime === 'function' &&
    (def.max as Date).getTime() < value.getTime()
  ) {
    return {
      type: SimpleSchema.ErrorTypes.MAX_DATE,
      max: dateToDateString(def.max as Date)
    }
  }
}
