import { expect } from 'expect'

import { SimpleSchema } from '../../src/SimpleSchema.js'
import { ValidationOptions } from '../../src/types.js'
import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectErrorOfTypeLength (type: string, ss: SimpleSchema, doc: Record<string | number | symbol, unknown>, options?: ValidationOptions): ExpectReturnTypes {
  const errors = validate(ss, doc, options).validationErrors()

  let errorCount = 0
  errors.forEach((error) => {
    if (error.type === type) errorCount++
  })
  return expect(errorCount)
}
