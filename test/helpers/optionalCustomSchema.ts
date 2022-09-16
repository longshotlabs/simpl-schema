import { SimpleSchema } from '../../src/SimpleSchema.js'

const optionalCustomSchema = new SimpleSchema({
  foo: {
    type: String,
    optional: true,
    custom: () => 'custom'
  }
})

export default optionalCustomSchema
