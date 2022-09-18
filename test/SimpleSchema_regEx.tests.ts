/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'

describe('SimpleSchema', function () {
  it('regEx - issue 409', function () {
    // Make sure no regEx errors for optional
    const schema = new SimpleSchema({
      foo: {
        type: String,
        optional: true,
        regEx: /bar/
      }
    })

    expect(schema.newContext().validate({})).toEqual(true)
    expect(schema.newContext().validate({ foo: null })).toEqual(true)
    expect(schema.newContext().validate({ foo: '' })).toEqual(false)
  })

  it('no regEx errors for empty strings when `skipRegExCheckForEmptyStrings` field option is true', function () {
    const schema = new SimpleSchema({
      foo: {
        type: String,
        optional: true,
        regEx: /bar/,
        skipRegExCheckForEmptyStrings: true
      }
    })

    expect(schema.newContext().validate({ foo: '' })).toBe(true)

    // still fails when not empty string, though
    expect(schema.newContext().validate({ foo: 'bad' })).toBe(false)
  })

  it('Optional regEx in subobject', function () {
    const schema = new SimpleSchema({
      foo: {
        type: Object,
        optional: true
      },
      'foo.url': {
        type: String,
        regEx: /bar/,
        optional: true
      }
    })

    const context = schema.namedContext()

    expect(context.validate({})).toEqual(true)

    expect(context.validate({
      foo: {}
    })).toEqual(true)

    expect(context.validate({
      foo: {
        url: null
      }
    })).toEqual(true)

    expect(context.validate({
      $set: {
        foo: {}
      }
    }, { modifier: true })).toEqual(true)

    expect(context.validate({
      $set: {
        'foo.url': null
      }
    }, { modifier: true })).toEqual(true)

    expect(context.validate({
      $unset: {
        'foo.url': ''
      }
    }, { modifier: true })).toEqual(true)
  })
})
