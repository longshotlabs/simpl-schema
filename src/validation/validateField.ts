import MongoObject from 'mongo-object'

import { SimpleSchema, ValidationContext } from '../SimpleSchema.js'
import { FieldInfo, FunctionPropContext, SchemaKeyDefinitionWithOneType, StandardSchemaKeyDefinitionWithSimpleTypes, ValidationError, ValidatorContext } from '../types.js'
import { appendAffectedKey, getParentOfKey, isObjectWeShouldTraverse } from '../utility/index.js'
import allowedValuesValidator from './allowedValuesValidator.js'
import requiredValidator from './requiredValidator.js'
import typeValidator from './typeValidator/index.js'

interface ValidateFieldProps {
  affectedKey?: string | undefined
  extendedCustomContext?: Record<string, unknown>
  isInArrayItemObject?: boolean
  isInSubObject?: boolean
  keysToValidate?: string[] | undefined
  obj: any
  op?: string | null
  schema: SimpleSchema
  val: any
  validationContext: ValidationContext
}

interface ShouldValidateKeyProps {
  affectedKey?: string | undefined
  affectedKeyGeneric?: string | undefined
  keysToValidate?: string[] | undefined
}

interface ShouldCheckValueProps {
  affectedKeyGeneric?: string | undefined
  isOptional?: boolean
  op: string | null
  val: any
}

function shouldValidateKey ({
  affectedKey,
  affectedKeyGeneric,
  keysToValidate
}: ShouldValidateKeyProps): boolean {
  if (keysToValidate == null) return true
  return keysToValidate.some(
    (keyToValidate) =>
      keyToValidate === affectedKey ||
      keyToValidate === affectedKeyGeneric ||
      (affectedKey?.startsWith(`${keyToValidate}.`) ?? false) ||
      (affectedKeyGeneric?.startsWith(`${keyToValidate}.`) ?? false)
  )
}

function shouldCheckValue ({
  affectedKeyGeneric,
  isOptional,
  op,
  val
}: ShouldCheckValueProps): boolean {
  if (op === '$unset') return false
  if (op === '$rename') return false
  if (val === undefined || val === null) {
    return affectedKeyGeneric?.slice(-2) === '.$' &&
    val === null &&
    isOptional !== true
  }
  return true
}

function makeGenericKeyOrThrow (key: string): string {
  const genericKey = MongoObject.makeKeyGeneric(key)
  if (genericKey == null) throw new Error(`Failed to get generic key for key "${key}"`)
  return genericKey
}

/**
 * Validate a single field within an object being validated
 * @returns Array of all validation errors
 */
export default function validateField (props: ValidateFieldProps): ValidationError[] {
  const {
    affectedKey,
    extendedCustomContext,
    isInArrayItemObject = false,
    isInSubObject = false,
    keysToValidate,
    obj,
    op = null,
    schema,
    validationContext
  } = props
  let { val } = props

  let affectedKeyGeneric: string | undefined
  let def: StandardSchemaKeyDefinitionWithSimpleTypes | undefined
  const fieldValidationErrors: ValidationError[] = []

  let mongoObject: MongoObject
  function getFieldInfo <ValueType> (key: string): FieldInfo<ValueType> {
    // Create mongoObject if necessary, cache for speed
    if (mongoObject === undefined) mongoObject = new MongoObject(obj, schema.blackboxKeys())

    const keyInfo = mongoObject.getInfoForKey(key) ?? {
      operator: null,
      value: undefined
    }

    return {
      ...keyInfo,
      isSet: keyInfo.value !== undefined
    }
  }

  if (affectedKey !== undefined) {
    // When we hit a blackbox key, we don't progress any further
    if (schema.keyIsInBlackBox(affectedKey)) return []

    affectedKeyGeneric = makeGenericKeyOrThrow(affectedKey)

    // Prepare the context object for the rule functions
    const fieldParentNameWithEndDot = getParentOfKey(affectedKey, true)
    const fieldParentName = fieldParentNameWithEndDot.slice(0, -1)

    const functionsContext: FunctionPropContext = {
      field (fName: string) {
        return getFieldInfo(fName)
      },
      genericKey: affectedKeyGeneric,
      isInArrayItemObject,
      isInSubObject,
      isModifier: op != null,
      isSet: val !== undefined,
      key: affectedKey,
      obj,
      operator: op,
      parentField () {
        return getFieldInfo(fieldParentName)
      },
      siblingField (fName: string) {
        return getFieldInfo(fieldParentNameWithEndDot + fName)
      },
      validationContext,
      value: val,
      ...(extendedCustomContext ?? {})
    }

    if (!shouldValidateKey({
      affectedKey,
      affectedKeyGeneric: affectedKeyGeneric ?? undefined,
      keysToValidate
    })) return []

    // Perform validation for this key
    for (const currentDef of schema.getDefinitions(affectedKey, null, functionsContext)) {
      def = currentDef

      // Whenever we try a new possible schema, clear any field errors from the previous tried schema
      fieldValidationErrors.length = 0

      const validatorContext: Omit<ValidatorContext, 'definition'> = {
        ...functionsContext,
        addValidationErrors (errors: ValidationError[]) {
          errors.forEach((error) => fieldValidationErrors.push(error))
        },
        // Value checks are not necessary for null or undefined values, except
        // for non-optional null array items, or for $unset or $rename values
        valueShouldBeChecked: shouldCheckValue({
          affectedKeyGeneric: affectedKeyGeneric ?? undefined,
          isOptional: currentDef.optional as boolean,
          op,
          val
        })
      }

      // Loop through each of the definitions in the SimpleSchemaGroup.
      // If the value matches any, we are valid and can stop checking the rest.
      for (const [typeIndex, typeDef] of currentDef.type.entries()) {
        // If the type is SimpleSchema.Any, then it is valid
        if (typeDef === SimpleSchema.Any) break

        const nonAnyTypeDefinition = typeDef as SchemaKeyDefinitionWithOneType
        const { type, ...definitionWithoutType } = currentDef

        // @ts-expect-error
        const finalValidatorContext: ValidatorContext = {
          ...validatorContext,

          // Take outer definition props like "optional" and "label"
          // and add them to inner props like "type" and "min"
          definition: {
            ...definitionWithoutType,
            ...nonAnyTypeDefinition
          }
        }

        // Order of these validators is important
        const customFieldValidator = nonAnyTypeDefinition.custom
        const fieldValidators = [
          requiredValidator,
          typeValidator,
          allowedValuesValidator,
          ...(customFieldValidator == null ? [] : [customFieldValidator]),
          // @ts-expect-error It's fine to access private method from here
          ...schema._validators,
          // @ts-expect-error It's fine to access private method from here
          ...SimpleSchema._validators
        ]

        const fieldValidationErrorsForThisType = []
        for (const fieldValidator of fieldValidators) {
          const result = fieldValidator.call(finalValidatorContext)

          // If the validator returns a string, assume it is the error type.
          if (typeof result === 'string') {
            fieldValidationErrorsForThisType.push({
              name: affectedKey,
              type: result,
              value: val
            })
          }

          // If the validator returns an object, assume it is an error object.
          if (typeof result === 'object' && result !== null) {
            fieldValidationErrorsForThisType.push({
              name: affectedKey,
              value: val,
              ...result
            })
          }
        }

        if (SimpleSchema.isSimpleSchema(nonAnyTypeDefinition.type)) {
          const itemErrors = validateField({
            extendedCustomContext,
            keysToValidate,
            obj: val,
            op,
            schema: nonAnyTypeDefinition.type as SimpleSchema,
            val,
            validationContext
          })
          if (itemErrors.length > 0) {
            fieldValidationErrorsForThisType.push(...itemErrors.map((error) => ({ ...error, name: `${affectedKey}.${error.name}` })))
          }
        }

        // As soon as we find a type for which the value is valid, stop checking more
        if (fieldValidationErrorsForThisType.length === 0) {
          // One we have chosen a valid schema, there is no need to validate the
          // properties of this object because we validated all the way down
          if (SimpleSchema.isSimpleSchema(nonAnyTypeDefinition.type)) {
            return fieldValidationErrors
          }
          break
        }

        if (typeIndex === currentDef.type.length - 1) {
          fieldValidationErrors.push(...fieldValidationErrorsForThisType)
        }
      }

      // If it's valid with this schema, we don't need to try any more
      if (fieldValidationErrors.length === 0) break
    }

    // Mark invalid if not found in schema
    if (def == null) {
      // We don't need KEY_NOT_IN_SCHEMA error for $unset and we also don't need to continue
      if (
        op === '$unset' ||
        (op === '$currentDate' && affectedKey.endsWith('.$type'))
      ) {
        return []
      }

      return [
        {
          name: affectedKey,
          type: SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
          value: val
        }
      ]
    }

    // For $rename, make sure that the new name is allowed by the schema
    if (op === '$rename' && !schema.allowsKey(val)) {
      return [
        {
          name: val,
          type: SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
          value: null
        }
      ]
    }

    // Loop through arrays
    if (Array.isArray(val)) {
      for (const [index, itemValue] of val.entries()) {
        const itemErrors = validateField({
          ...props,
          affectedKey: `${affectedKey}.${index}`,
          val: itemValue
        })
        if (itemErrors.length > 0) {
          fieldValidationErrors.push(...itemErrors)
        }
      }
      return fieldValidationErrors
    }
  }

  // If affectedKeyGeneric is undefined due to this being the first run of this
  // function, objectKeys will return the top-level keys.
  const childKeys = schema.objectKeys(affectedKeyGeneric ?? undefined)

  // Temporarily convert missing objects to empty objects
  // so that the looping code will be called and required
  // descendent keys can be validated.
  if (
    (val === undefined || val === null) &&
    ((def == null) || (def.optional !== true && childKeys.length > 0))
  ) {
    val = {}
  }

  // Loop through object keys
  if (
    isObjectWeShouldTraverse(val) &&
    // @ts-expect-error
    ((def == null) || !schema._blackboxKeys.has(affectedKey ?? ''))
  ) {
    // Check all present keys plus all keys defined by the schema.
    // This allows us to detect extra keys not allowed by the schema plus
    // any missing required keys, and to run any custom functions for other keys.
    for (const key of new Set([...Object.keys(val), ...childKeys])) {
      const childFieldErrors = validateField({
        ...props,
        affectedKey: appendAffectedKey(affectedKey, key) as string,
        // If this object is within an array, make sure we check for required as if it's not a modifier
        isInArrayItemObject: affectedKeyGeneric?.slice(-2) === '.$',
        isInSubObject: true,
        val: val[key]
      })
      if (childFieldErrors.length > 0) {
        fieldValidationErrors.push(...childFieldErrors)
      }
    }
  }

  return fieldValidationErrors
}
