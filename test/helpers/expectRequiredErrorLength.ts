import { expect } from 'expect'

import { SimpleSchema } from '../../src/SimpleSchema.js'
import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectRequiredErrorLength (ss: any, doc: any, options: any): ExpectReturnTypes {
  const errors = validate(ss, doc, options).validationErrors()

  let requiredErrorCount = 0
  errors.forEach((error) => {
    if (error.type === SimpleSchema.ErrorTypes.REQUIRED) requiredErrorCount++
  })
  return expect(requiredErrorCount)
}
