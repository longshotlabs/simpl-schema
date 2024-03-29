/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'

describe('SimpleSchema - autoValueFunctions', function () {
  it('simple', function () {
    const schema = new SimpleSchema({
      a: {
        type: String,
        autoValue () {}
      }
    })

    const autoValueFunctions = schema.autoValueFunctions()
    expect(autoValueFunctions.length).toBe(1)
    expect(autoValueFunctions[0].func != null).toBe(true)
    expect(autoValueFunctions[0].fieldName).toBe('a')
    expect(autoValueFunctions[0].closestSubschemaFieldName).toBe('')
  })

  it('one level of subschema', function () {
    const subschema = new SimpleSchema({
      z: {
        type: Object,
        autoValue () {}
      }
    })

    const schema = new SimpleSchema({
      a: {
        type: Object,
        autoValue () {}
      },
      'a.b': {
        type: String,
        autoValue () {}
      },
      c: {
        type: subschema
      }
    })

    const autoValueFunctions = schema.autoValueFunctions()
    expect(autoValueFunctions.length).toBe(3)

    expect(autoValueFunctions[0].func != null).toBe(true)
    expect(autoValueFunctions[0].fieldName).toBe('a')
    expect(autoValueFunctions[0].closestSubschemaFieldName).toBe('')

    expect(autoValueFunctions[1].func != null).toBe(true)
    expect(autoValueFunctions[1].fieldName).toBe('a.b')
    expect(autoValueFunctions[1].closestSubschemaFieldName).toBe('')

    expect(autoValueFunctions[2].func != null).toBe(true)
    expect(autoValueFunctions[2].fieldName).toBe('c.z')
    expect(autoValueFunctions[2].closestSubschemaFieldName).toBe('c')
  })

  it('two levels of subschemas', function () {
    const subschema1 = new SimpleSchema({
      x: {
        type: Object,
        autoValue () {}
      },
      'x.m': {
        type: Array,
        autoValue () {}
      },
      'x.m.$': {
        type: String
      }
    })

    const subschema2 = new SimpleSchema({
      z: {
        type: Object,
        autoValue () {}
      },
      'z.y': {
        type: subschema1
      }
    })

    const schema = new SimpleSchema({
      a: {
        type: Object,
        autoValue () {}
      },
      'a.b': {
        type: String,
        autoValue () {}
      },
      c: {
        type: subschema2
      }
    })

    const autoValueFunctions = schema.autoValueFunctions()
    expect(autoValueFunctions.length).toBe(5)

    expect(autoValueFunctions[0].func != null).toBe(true)
    expect(autoValueFunctions[0].fieldName).toBe('a')
    expect(autoValueFunctions[0].closestSubschemaFieldName).toBe('')

    expect(autoValueFunctions[1].func != null).toBe(true)
    expect(autoValueFunctions[1].fieldName).toBe('a.b')
    expect(autoValueFunctions[1].closestSubschemaFieldName).toBe('')

    expect(autoValueFunctions[2].func != null).toBe(true)
    expect(autoValueFunctions[2].fieldName).toBe('c.z')
    expect(autoValueFunctions[2].closestSubschemaFieldName).toBe('c')

    expect(autoValueFunctions[3].func != null).toBe(true)
    expect(autoValueFunctions[3].fieldName).toBe('c.z.y.x')
    expect(autoValueFunctions[3].closestSubschemaFieldName).toBe('c.z.y')

    expect(autoValueFunctions[4].func != null).toBe(true)
    expect(autoValueFunctions[4].fieldName).toBe('c.z.y.x.m')
    expect(autoValueFunctions[4].closestSubschemaFieldName).toBe('c.z.y')
  })

  it('array of objects', function () {
    const subschema = new SimpleSchema({
      z: {
        type: String,
        autoValue () {}
      }
    })

    const schema = new SimpleSchema({
      a: {
        type: Object,
        autoValue () {}
      },
      'a.b': {
        type: Array
      },
      'a.b.$': {
        type: subschema
      }
    })

    const autoValueFunctions = schema.autoValueFunctions()
    expect(autoValueFunctions.length).toBe(2)

    expect(autoValueFunctions[0].func != null).toBe(true)
    expect(autoValueFunctions[0].fieldName).toBe('a')
    expect(autoValueFunctions[0].closestSubschemaFieldName).toBe('')

    expect(autoValueFunctions[1].func != null).toBe(true)
    expect(autoValueFunctions[1].fieldName).toBe('a.b.$.z')
    expect(autoValueFunctions[1].closestSubschemaFieldName).toBe('a.b.$')
  })

  it('modifier with autovalue in subschema', function () {
    const datesSchema = new SimpleSchema({
      updatedAt: {
        type: Date,
        label: 'Updated At',
        optional: true,
        autoValue: function () {
          return new Date()
        }
      }
    })

    const schema = new SimpleSchema({
      otherStuff: {
        type: String,
        optional: true
      },
      dates: {
        type: datesSchema,
        label: 'Dates',
        optional: true,
        defaultValue: {}
      }
    })

    const modifier = {
      $set: { otherStuff: 'someOtherString' }
    }

    const cleanedModifier = schema.clean(modifier, {
      isModifier: true
    }) as any
    expect(cleanedModifier.$set['dates.updatedAt']).not.toBeUndefined()
    expect(cleanedModifier.$set['dates.updatedAt']).toBeInstanceOf(Date)
  })
})
