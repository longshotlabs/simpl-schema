/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { schemaDefinitionOptions, SimpleSchema } from '../src/SimpleSchema.js'

describe('SimpleSchema - Extend Schema Definition', function () {
  it('throws an error when the schema definition includes an unrecognized key', function () {
    expect(() => {
      // eslint-disable-next-line no-new
      new SimpleSchema({
        name: {
          type: String,
          // @ts-expect-error
          unique: true
        }
      })
    }).toThrow()
  })

  it('does not throw an error when the schema definition includes a registered key', function () {
    SimpleSchema.extendOptions(['unique'])

    expect(() => {
      // eslint-disable-next-line no-new
      new SimpleSchema({
        name: {
          type: String,
          // @ts-expect-error
          unique: true
        }
      })
    }).not.toThrow()

    // Reset
    schemaDefinitionOptions.splice(schemaDefinitionOptions.indexOf('unique'), 1)
  })
})
