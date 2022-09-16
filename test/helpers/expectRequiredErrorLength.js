import expect from 'expect'

import { SimpleSchema } from '../SimpleSchema'
import validate from './validate'

export default function expectRequiredErrorLength (...args) {
  const errors = validate(...args).validationErrors()

  let requiredErrorCount = 0
  errors.forEach((error) => {
    if (error.type === SimpleSchema.ErrorTypes.REQUIRED) requiredErrorCount++
  })
  return expect(requiredErrorCount)
}
