import './clean.js'

import { SimpleSchema, ValidationContext } from './SimpleSchema.js'
import { toJsonSchema } from './toJsonSchema.js'

SimpleSchema.ValidationContext = ValidationContext

export { toJsonSchema, ValidationContext }

export default SimpleSchema
