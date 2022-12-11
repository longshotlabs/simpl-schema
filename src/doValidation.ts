import MongoObject from 'mongo-object'

import { SimpleSchema } from './SimpleSchema.js'
import { ValidationError } from './types.js'
import validateDocument from './validation/validateDocument.js'
import validateField from './validation/validateField.js'
import ValidationContext from './ValidationContext.js'

function shouldCheck (operator: string): boolean {
  if (operator === '$pushAll') { throw new Error('$pushAll is not supported; use $push + $each') }
  return !['$pull', '$pullAll', '$pop', '$slice'].includes(operator)
}

interface DoValidationProps {
  extendedCustomContext?: Record<string, unknown>
  ignoreTypes?: string[]
  isModifier: boolean
  isUpsert: boolean
  keysToValidate?: string[]
  mongoObject?: MongoObject
  obj: any
  schema: SimpleSchema
  validationContext: ValidationContext
}

function doValidation ({
  extendedCustomContext,
  ignoreTypes,
  isModifier,
  isUpsert,
  keysToValidate,
  mongoObject,
  obj,
  schema,
  validationContext
}: DoValidationProps): ValidationError[] {
  const validationErrors: ValidationError[] = []

  // Kick off the validation
  if (isModifier) {
    // Loop through operators
    for (const [op, opObj] of Object.entries<Record<string, any>>(obj)) {
      // If non-operators are mixed in, throw error
      if (op.slice(0, 1) !== '$') {
        throw new Error(
              `Expected '${op}' to be a modifier operator like '$set'`
        )
      }
      if (!shouldCheck(op)) continue

      const presentKeys = Object.keys(opObj)
      const fields = presentKeys.map((opKey) => {
        let value = opObj[opKey]
        if (op === '$push' || op === '$addToSet') {
          if (typeof value === 'object' && '$each' in value) {
            value = value.$each
          } else {
            opKey = `${opKey}.0`
          }
        }
        return { key: opKey, value }
      })

      // For an upsert, missing props would not be set if an insert is performed,
      // so we check them all with undefined value to force any 'required' checks to fail
      if (isUpsert && (op === '$set' || op === '$setOnInsert')) {
        for (const key of schema.objectKeys()) {
          if (!presentKeys.includes(key)) {
            fields.push({ key, value: undefined })
          }
        }
      }

      for (const field of fields) {
        const fieldErrors = validateField({
          affectedKey: field.key,
          obj,
          op,
          schema,
          val: field.value,
          validationContext
        })
        if (fieldErrors.length > 0) {
          validationErrors.push(...fieldErrors)
        }
      }
    }
  } else {
    const fieldErrors = validateField({
      obj,
      schema,
      val: obj,
      validationContext
    })
    if (fieldErrors.length > 0) {
      validationErrors.push(...fieldErrors)
    }
  }

  const wholeDocumentErrors = validateDocument({
    extendedCustomContext,
    ignoreTypes,
    isModifier,
    isUpsert,
    keysToValidate,
    mongoObject,
    obj,
    schema,
    validationContext
  })
  if (wholeDocumentErrors.length > 0) {
    validationErrors.push(...wholeDocumentErrors)
  }

  const addedFieldNames = new Set<string>()
  return validationErrors.filter((errObj) => {
    // Remove error types the user doesn't care about
    if (ignoreTypes?.includes(errObj.type) === true) return false
    // Make sure there is only one error per fieldName
    if (addedFieldNames.has(errObj.name)) return false

    addedFieldNames.add(errObj.name)
    return true
  })
}

export default doValidation
