import { expect } from 'expect'

import { ExpectReturnTypes } from './expectTypes.js'
import validate from './validate.js'

export default function expectErrorLength (ss: any, doc: any, options: any): ExpectReturnTypes {
  return expect(validate(ss, doc, options).validationErrors().length)
}
