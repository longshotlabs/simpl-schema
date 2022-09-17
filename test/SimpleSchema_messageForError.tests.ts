/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'

const validationError = { name: 'name', type: 'required', value: undefined }

describe('SimpleSchema - messageForError', function () {
  it('returns default message', function () {
    const schema = new SimpleSchema({ name: String })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name is required')
  })

  it('returns message from getErrorMessage in schema options', function () {
    const schema = new SimpleSchema({ name: String }, {
      getErrorMessage (err, label) {
        if (err.type === 'required') return `${String(label)} must be provided`
      }
    })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name must be provided')
  })

  it('returns message from global getErrorMessage', function () {
    globalThis.simpleSchemaGlobalConfig = {
      getErrorMessage (err, label) {
        if (err.type === 'required') return `${String(label)} is missing`
      }
    }

    const schema = new SimpleSchema({ name: String })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name is missing')

    globalThis.simpleSchemaGlobalConfig = {}
  })

  it('schema getErrorMessage overrides global getErrorMessage', function () {
    globalThis.simpleSchemaGlobalConfig = {
      getErrorMessage (err, label) {
        if (err.type === 'required') return `${String(label)} is missing`
      }
    }

    const schema = new SimpleSchema({ name: String }, {
      getErrorMessage (err, label) {
        if (err.type === 'required') return `${String(label)} must be provided`
      }
    })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name must be provided')

    globalThis.simpleSchemaGlobalConfig = {}
  })

  it('global getErrorMessage is used if schema getErrorMessage returns undefined', function () {
    globalThis.simpleSchemaGlobalConfig = {
      getErrorMessage (err, label) {
        if (err.type === 'required') return `${String(label)} is missing`
      }
    }

    const schema = new SimpleSchema({ name: String }, {
      getErrorMessage () {
        return undefined
      }
    })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name is missing')

    globalThis.simpleSchemaGlobalConfig = {}
  })

  it('default message is returned if both user getErrorMessage return undefined', function () {
    globalThis.simpleSchemaGlobalConfig = {
      getErrorMessage () {
        return undefined
      }
    }

    const schema = new SimpleSchema({ name: String }, {
      getErrorMessage () {
        return undefined
      }
    })
    const message = schema.messageForError(validationError)
    expect(message).toBe('Name is required')

    globalThis.simpleSchemaGlobalConfig = {}
  })
})
