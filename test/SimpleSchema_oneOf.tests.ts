/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'

describe('SimpleSchema', function () {
  describe('oneOf', function () {
    it('allows either type', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, Number, Date)
      })

      const test1 = { foo: 1 }
      expect(function test1func () {
        schema.validate(test1)
      }).not.toThrow()
      expect(typeof test1.foo).toBe('number')

      const test2 = { foo: 'bar' }
      expect(function test2func () {
        schema.validate(test2)
      }).not.toThrow()
      expect(typeof test2.foo).toBe('string')

      const test3 = { foo: new Date() }
      expect(function test2func () {
        schema.validate(test3)
      }).not.toThrow()
      expect(test3.foo instanceof Date).toBe(true)

      const test4 = { foo: false }
      expect(function test3func () {
        schema.validate(test4)
      }).toThrow()
      expect(typeof test4.foo).toBe('boolean')
    })

    it.skip('allows either type including schemas', function () {
      const schemaOne = new SimpleSchema({
        itemRef: String,
        partNo: String
      })

      const schemaTwo = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String
      })

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(String, schemaOne, schemaTwo)
      })

      let isValid = combinedSchema.namedContext().validate({
        item: 'foo'
      })
      expect(isValid).toBe(true)

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'hhh',
          partNo: 'ttt'
        }
      })
      expect(isValid).toBe(true)

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'hhh',
          partNo: 'ttt'
        }
      })
      expect(isValid).toBe(true)
    })

    it('is valid as long as one min value is met', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf({
          type: SimpleSchema.Integer,
          min: 5
        }, {
          type: SimpleSchema.Integer,
          min: 10
        })
      })

      expect(function () {
        schema.validate({ foo: 7 })
      }).not.toThrow()
    })

    it('works when one is an array', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, Array),
        'foo.$': String
      })

      expect(function () {
        schema.validate({
          foo: 'bar'
        })
      }).not.toThrow()

      expect(function () {
        schema.validate({
          foo: 1
        })
      }).toThrow()

      expect(function () {
        schema.validate({
          foo: []
        })
      }).not.toThrow()

      expect(function () {
        schema.validate({
          foo: ['bar', 'bin']
        })
      }).not.toThrow()

      expect(function () {
        schema.validate({
          foo: ['bar', 1]
        })
      }).toThrow()
    })

    it('works when one is a schema', function () {
      const objSchema = new SimpleSchema({
        _id: String
      })

      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, objSchema)
      })

      expect(function () {
        schema.validate({
          foo: 'bar'
        })
      }).not.toThrow()

      expect(function () {
        schema.validate({
          foo: 1
        })
      }).toThrow()

      expect(function () {
        schema.validate({
          foo: []
        })
      }).toThrow()

      expect(function () {
        schema.validate({
          foo: {}
        })
      }).toThrow()

      expect(function () {
        schema.validate({
          foo: {
            _id: 'ID'
          }
        })
      }).not.toThrow()
    })

    it('is invalid if neither min value is met', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf({
          type: SimpleSchema.Integer,
          min: 5
        }, {
          type: SimpleSchema.Integer,
          min: 10
        })
      })

      expect(function () {
        schema.validate({ foo: 3 })
      }).toThrow()
    })
  })
})
