import MongoObject from 'mongo-object'

import { SimpleSchema, ValidationContext } from '../SimpleSchema.js'
import { DocValidatorContext, ValidationError } from '../types.js'

interface ValidateDocumentProps {
  extendedCustomContext?: Record<string, unknown>
  ignoreTypes?: string[]
  isModifier: boolean
  isUpsert: boolean
  keysToValidate?: string[] | undefined
  mongoObject?: MongoObject
  obj: any
  schema: SimpleSchema
  validationContext: ValidationContext
}

export default function validateDocument ({
  extendedCustomContext,
  ignoreTypes,
  isModifier,
  isUpsert,
  keysToValidate,
  mongoObject,
  obj,
  schema,
  validationContext
}: ValidateDocumentProps): ValidationError[] {
  // @ts-expect-error
  const docValidators = schema._docValidators.concat(
    // @ts-expect-error
    SimpleSchema._docValidators
  )
  const docValidatorContext: DocValidatorContext = {
    ignoreTypes,
    isModifier,
    isUpsert,
    keysToValidate,
    mongoObject,
    obj,
    schema,
    validationContext,
    ...(extendedCustomContext ?? {})
  }
  const validationErrors: ValidationError[] = []
  for (const docValidator of docValidators) {
    const errors = docValidator.call(docValidatorContext, obj)
    if (!Array.isArray(errors)) {
      throw new Error(
        'Custom doc validator must return an array of error objects'
      )
    }
    if (errors.length > 0) {
      validationErrors.push(...errors)
    }
  }
  return validationErrors
}
