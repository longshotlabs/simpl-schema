import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'

describe('SimpleSchema - MongoDB positional array updates', function () {
  for (const operator of ['$[]', '$[identifier]']) {
    describe(operator, function () {
      const stringSchema = new SimpleSchema({
        someArray: Array,
        'someArray.$': String
      })
      const objectSchema = new SimpleSchema({
        someArray: Array,
        'someArray.$': Object,
        'someArray.$.someValue': Number
      })

      it('accepts setting array items to the declared type', function () {
        const context = stringSchema.newContext()

        expect(
          context.validate({ $set: { [`someArray.${operator}`]: 'a' } }, { modifier: true })
        ).toBe(true)
        expect(context.validationErrors()).toEqual([])
      })

      it('rejects setting array items to the wrong type', function () {
        const context = stringSchema.newContext()
        const key = `someArray.${operator}`

        expect(context.validate({ $set: { [key]: 42 } }, { modifier: true })).toBe(false)
        expect(context.validationErrors()).toEqual([
          expect.objectContaining({ name: key, type: SimpleSchema.ErrorTypes.EXPECTED_TYPE })
        ])
      })

      it('accepts incrementing a numeric field within array items', function () {
        const context = objectSchema.newContext()
        const key = `someArray.${operator}.someValue`

        expect(context.validate({ $inc: { [key]: 1 } }, { modifier: true })).toBe(true)
        expect(context.validationErrors()).toEqual([])
      })

      it('rejects incrementing a numeric field with a string', function () {
        const context = objectSchema.newContext()
        const key = `someArray.${operator}.someValue`

        expect(context.validate({ $inc: { [key]: 'bad' } }, { modifier: true })).toBe(false)
        expect(context.validationErrors()).toEqual([
          expect.objectContaining({ name: key, type: SimpleSchema.ErrorTypes.EXPECTED_TYPE })
        ])
      })

      it('rejects fields not declared in the array item schema', function () {
        const context = objectSchema.newContext()
        const key = `someArray.${operator}.unknown`

        expect(context.validate({ $set: { [key]: 1 } }, { modifier: true })).toBe(false)
        expect(context.validationErrors()).toEqual([
          expect.objectContaining({ name: key, type: SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA })
        ])
      })
    })
  }
})
