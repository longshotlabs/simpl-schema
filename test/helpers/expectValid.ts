import { expect } from 'expect'

import validate from './validate.js'

export default function expectValid (ss: any, doc: any, options: any): void {
  expect(validate(ss, doc, options).isValid()).toBe(true)
}
