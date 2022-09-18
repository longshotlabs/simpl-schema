import { expect } from 'expect'

import { SimpleSchema } from '../../src/SimpleSchema.js'
import { ValidationOptions } from '../../src/types.js'
import validate from './validate.js'

export default function expectValid (ss: SimpleSchema, doc: Record<string | number | symbol, unknown>, options?: ValidationOptions): void {
  expect(validate(ss, doc, options).isValid()).toBe(true)
}
