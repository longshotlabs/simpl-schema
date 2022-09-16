import { expect } from 'expect'

import { ValidationOptions } from '../../src/types.js'
import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectErrorLength (ss: any, doc: any, options?: ValidationOptions): ExpectReturnTypes {
  return expect(validate(ss, doc, options).validationErrors().length)
}
