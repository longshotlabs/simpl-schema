import './clean.js'

import { schemaDefinitionOptions, SimpleSchema, ValidationContext } from './SimpleSchema.js'
import { toJsonSchema } from './toJsonSchema.js'

SimpleSchema.ValidationContext = ValidationContext

export { schemaDefinitionOptions, toJsonSchema, ValidationContext }

export default SimpleSchema
