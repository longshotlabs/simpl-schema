import { expect } from 'expect'

import { SimpleSchema } from '../../src/SimpleSchema.js'
import { ValidationOptions } from '../../src/types.js'
import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectErrorLength (ss: SimpleSchema, doc: Record<string | number | symbol, unknown>, options?: ValidationOptions): ExpectReturnTypes {
  return expect(validate(ss, doc, options).validationErrors().length)
}
