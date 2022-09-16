import { expect } from 'expect'

import { ValidationOptions } from '../../src/types.js'
import validate from './validate.js'

export default function expectValid (ss: any, doc: any, options?: ValidationOptions): void {
  expect(validate(ss, doc, options).isValid()).toBe(true)
}
