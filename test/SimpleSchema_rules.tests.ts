/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'
import { FunctionPropContext } from '../src/types.js'

describe('SimpleSchema - Rules', function () {
  it('Rules should be passed the object being validated', function () {
    const validationContext = new SimpleSchema({
      foo: {
        type: Number
      },
      bar: {
        type: Number,
        max (this: FunctionPropContext & { obj: { foo: number } }) {
          return this.obj.foo
        }
      }
    }).newContext()

    validationContext.validate({ foo: 5, bar: 10 })
    expect(validationContext.validationErrors().length).toBe(1)
    validationContext.validate({ foo: 10, bar: 5 })
    expect(validationContext.validationErrors().length).toBe(0)
  })
})
