import { expect } from 'expect'

import { ValidationOptions } from '../../src/types.js'
import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectErrorOfTypeLength (type: string, ss: any, doc: any, options?: ValidationOptions): ExpectReturnTypes {
  const errors = validate(ss, doc, options).validationErrors()

  let errorCount = 0
  errors.forEach((error) => {
    if (error.type === type) errorCount++
  })
  return expect(errorCount)
}
