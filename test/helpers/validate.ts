import { SimpleSchema, ValidationContext } from '../../src/SimpleSchema.js'
import { ValidationOptions } from '../../src/types.js'

export default function validate (ss: SimpleSchema, doc: Record<string | number | symbol, unknown>, options?: ValidationOptions): ValidationContext {
  const context = ss.newContext()
  context.validate(doc, options)
  return context
}
