/* eslint-disable no-undef */
import MongoObject from 'mongo-object'

import clean from './clean.js'
import { getDefaultErrorMessage } from './defaultMessages.js'
import { ClientError } from './errors.js'
import expandShorthand from './expandShorthand.js'
import SimpleSchemaGroup from './SimpleSchemaGroup.js'
import {
  AutoValueContext,
  AutoValueFunctionDetails,
  CleanOptions,
  DocValidatorFunction,
  PartialSchemaDefinitionWithShorthand,
  ResolvedSchemaDefinition,
  SchemaDefinition,
  SchemaDefinitionWithShorthand,
  SchemaKeyDefinition,
  SchemaKeyDefinitionWithOneType,
  SimpleSchemaOptions,
  StandardSchemaKeyDefinition,
  StandardSchemaKeyDefinitionWithSimpleTypes,
  SupportedTypes,
  ValidationError,
  ValidationOptions,
  ValidatorFunction
} from './types.js'
import { forEachKeyAncestor, humanize, isEmptyObject } from './utility/index.js'
import ValidationContext from './ValidationContext.js'

export const schemaDefinitionOptions = [
  'autoValue',
  'defaultValue',
  'label',
  'optional',
  'required',
  'type'
]

const oneOfProps = [
  'allowedValues',
  'blackbox',
  'custom',
  'exclusiveMax',
  'exclusiveMin',
  'max',
  'maxCount',
  'min',
  'minCount',
  'regEx',
  'skipRegExCheckForEmptyStrings',
  'trim',
  'type'
]

const propsThatCanBeFunction = [
  'allowedValues',
  'exclusiveMax',
  'exclusiveMin',
  'label',
  'max',
  'maxCount',
  'min',
  'minCount',
  'optional',
  'regEx',
  'skipRegExCheckForEmptyStrings'
]

class SimpleSchema {
  public static debug?: boolean
  public static defaultLabel?: string

  /**
   * Packages that want to allow and check additional options
   * should add the option names to this set.
   */
  public static supportedConstructorOptions = new Set([
    'clean',
    'getErrorMessage',
    'humanizeAutoLabels',
    'keepRawDefinition',
    'requiredByDefault',
    'defaultLabel'
  ])

  /**
   * Packages that want to allow and check additional options
   * should add the option names to this set.
   */
  public static supportedCleanOptions = new Set([
    'autoConvert',
    'extendAutoValueContext',
    'filter',
    'getAutoValues',
    'isModifier',
    'isUpsert',
    'mongoObject',
    'mutate',
    'removeEmptyStrings',
    'removeNullsFromArrays',
    'trimStrings'
  ])

  public static validationErrorTransform?: (error: ClientError<ValidationError[]>) => Error
  public static version = 2
  public version: number
  // Global constructor options
  private static _constructorOptionDefaults: SimpleSchemaOptions = {
    clean: {
      autoConvert: true,
      extendAutoValueContext: {},
      filter: true,
      getAutoValues: true,
      removeEmptyStrings: true,
      removeNullsFromArrays: false,
      trimStrings: true
    },
    humanizeAutoLabels: true,
    requiredByDefault: true
  }

  private static readonly _docValidators: DocValidatorFunction[] = []
  private static readonly _validators: ValidatorFunction[] = []
  private _autoValues: AutoValueFunctionDetails[] = []
  private _blackboxKeys = new Set<string>()
  private _cleanOptions: CleanOptions = {}
  private readonly _constructorOptions: SimpleSchemaOptions = {}
  private _docValidators: DocValidatorFunction[] = []
  private _firstLevelSchemaKeys: string[] = []
  private readonly _rawDefinition: SchemaDefinitionWithShorthand | null = null
  private _schema: ResolvedSchemaDefinition = {}
  private _schemaKeys: string[] = []
  // Named validation contexts
  private _validationContexts: Record<string, ValidationContext> = {}
  private _validators: ValidatorFunction[] = []

  constructor (
    schema: SchemaDefinitionWithShorthand = {},
    options: SimpleSchemaOptions = {}
  ) {
    // Stash the options object
    this._constructorOptions = {
      ...SimpleSchema._constructorOptionDefaults,
      ...options
    }
    delete this._constructorOptions.clean // stored separately below

    Object.getOwnPropertyNames(this._constructorOptions).forEach((opt) => {
      if (!SimpleSchema.supportedConstructorOptions.has(opt)) {
        console.warn(`Unsupported "${opt}" option passed to SimpleSchema constructor`)
      }
    })

    // Schema-level defaults for cleaning
    this._cleanOptions = {
      ...SimpleSchema._constructorOptionDefaults.clean,
      ...(options.clean ?? {})
    }

    // Custom validators for this instance
    this._docValidators = []

    // Clone, expanding shorthand, and store the schema object in this._schema
    this.extend(schema)

    // Clone raw definition and save if keepRawDefinition is active
    if (this._constructorOptions.keepRawDefinition === true) {
      this._rawDefinition = schema
    }

    this.version = SimpleSchema.version
  }

  /**
  /* @returns The entire raw schema definition passed in the constructor
  */
  get rawDefinition (): SchemaDefinitionWithShorthand | null {
    return this._rawDefinition
  }

  forEachAncestorSimpleSchema (
    key: string,
    func: (
      ssInstance: SimpleSchema,
      ancestor: string,
      ancestorGenericKey: string
    ) => void
  ): void {
    const genericKey = MongoObject.makeKeyGeneric(key)
    if (genericKey == null) return

    forEachKeyAncestor(genericKey, (ancestor) => {
      const def = this._schema[ancestor]
      if (def == null) return
      def.type.definitions.forEach((typeDef) => {
        if (SimpleSchema.isSimpleSchema(typeDef.type)) {
          func(typeDef.type as SimpleSchema, ancestor, genericKey.slice(ancestor.length + 1))
        }
      })
    })
  }

  /**
   * Returns whether the obj is a SimpleSchema object.
   * @param [obj] An object to test
   * @returns True if the given object appears to be a SimpleSchema instance
   */
  static isSimpleSchema (obj: unknown): boolean {
    if (obj == null) return false
    return obj instanceof SimpleSchema || Object.prototype.hasOwnProperty.call(obj, '_schema')
  }

  /**
   * @param key One specific or generic key for which to get the schema.
   * @returns Returns a 2-tuple.
   *
   *   First item: The SimpleSchema instance that actually defines the given key.
   *
   *   For example, if you have several nested objects, each their own SimpleSchema
   *   instance, and you pass in 'outerObj.innerObj.innermostObj.name' as the key, you'll
   *   get back the SimpleSchema instance for `outerObj.innerObj.innermostObj` key.
   *
   *   But if you pass in 'outerObj.innerObj.innermostObj.name' as the key and that key is
   *   defined in the main schema without use of subschemas, then you'll get back the main schema.
   *
   *   Second item: The part of the key that is in the found schema.
   *
   *   Always returns a tuple (array) but the values may be `null`.
   */
  nearestSimpleSchemaInstance (
    key: string | null
  ): [SimpleSchema | null, string | null] {
    if (key == null) return [null, null]

    const genericKey = MongoObject.makeKeyGeneric(key)
    if (genericKey == null) return [null, null]

    if (this._schema[genericKey] !== undefined) return [this, genericKey]

    // If not defined in this schema, see if it's defined in a sub-schema
    let innerKey
    let nearestSimpleSchemaInstance: SimpleSchema | null = null
    this.forEachAncestorSimpleSchema(
      key,
      (simpleSchema, ancestor, subSchemaKey) => {
        if (
          (nearestSimpleSchemaInstance == null) &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          simpleSchema._schema[subSchemaKey]
        ) {
          nearestSimpleSchemaInstance = simpleSchema
          innerKey = subSchemaKey
        }
      }
    )

    return innerKey != null ? [nearestSimpleSchemaInstance, innerKey] : [null, null]
  }

  /**
   * @param [key] One specific or generic key for which to get the schema.
   * @returns The entire schema object or just the definition for one key.
   *
   * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
   * if you want the evaluated definition, where any properties that are functions
   * have been run to produce a result.
   */
  schema (): ResolvedSchemaDefinition
  schema (key: string): StandardSchemaKeyDefinition | null
  schema (key?: string): ResolvedSchemaDefinition | StandardSchemaKeyDefinition | null {
    if (key == null) return this._schema

    const genericKey = MongoObject.makeKeyGeneric(key)
    let keySchema = genericKey == null ? null : this._schema[genericKey]

    // If not defined in this schema, see if it's defined in a subschema
    if (keySchema == null) {
      let found = false
      this.forEachAncestorSimpleSchema(
        key,
        (simpleSchema, ancestor, subSchemaKey) => {
          if (!found) keySchema = simpleSchema.schema(subSchemaKey)
          if (keySchema != null) found = true
        }
      )
    }

    return keySchema
  }

  /**
   * @param key One specific or generic key for which to get all possible schemas.
   * @returns An potentially empty array of possible definitions for one key
   *
   * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
   * if you want the evaluated definition, where any properties that are functions
   * have been run to produce a result.
   */
  schemas (key: string): StandardSchemaKeyDefinition[] {
    const schemas: StandardSchemaKeyDefinition[] = []

    const genericKey = MongoObject.makeKeyGeneric(key)
    const keySchema = genericKey == null ? null : this._schema[genericKey]
    if (keySchema != null) schemas.push(keySchema)

    // See if it's defined in any subschema
    this.forEachAncestorSimpleSchema(
      key,
      (simpleSchema, ancestor, subSchemaKey) => {
        const keyDef = simpleSchema.schema(subSchemaKey)
        if (keyDef != null) schemas.push(keyDef)
      }
    )

    return schemas
  }

  /**
   * @returns {Object} The entire schema object with subschemas merged. This is the
   * equivalent of what schema() returned in SimpleSchema < 2.0
   *
   * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
   * if you want the evaluated definition, where any properties that are functions
   * have been run to produce a result.
   */
  mergedSchema (): SchemaDefinition {
    const mergedSchema: SchemaDefinition = {}

    this._schemaKeys.forEach((key) => {
      const keySchema = this._schema[key]
      mergedSchema[key] = keySchema

      keySchema.type.definitions.forEach((typeDef) => {
        if (!SimpleSchema.isSimpleSchema(typeDef.type)) return
        const childSchema = (typeDef.type as SimpleSchema).mergedSchema()
        Object.keys(childSchema).forEach((subKey) => {
          mergedSchema[`${key}.${subKey}`] = childSchema[subKey]
        })
      })
    })

    return mergedSchema
  }

  /**
   * Returns the evaluated definition for one key in the schema
   *
   * @param key Generic or specific schema key
   * @param [propList] Array of schema properties you need; performance optimization
   * @param [functionContext] The context to use when evaluating schema options that are functions
   * @returns The schema definition for the requested key
   */
  getDefinition (
    key: string,
    propList?: string[] | null,
    functionContext: Record<string, unknown> = {}
  ): StandardSchemaKeyDefinitionWithSimpleTypes | undefined {
    const schemaKeyDefinition = this.schema(key)
    if (schemaKeyDefinition == null) return
    return this.resolveDefinitionForSchema(key, schemaKeyDefinition, propList, functionContext)
  }

  /**
   * Returns the evaluated definition for one key in the schema
   *
   * @param key Generic or specific schema key
   * @param [propList] Array of schema properties you need; performance optimization
   * @param [functionContext] The context to use when evaluating schema options that are functions
   * @returns The schema definition for the requested key
   */
  getDefinitions (
    key: string,
    propList?: string[] | null,
    functionContext: Record<string, unknown> = {}
  ): StandardSchemaKeyDefinitionWithSimpleTypes[] {
    const schemaKeyDefinitions = this.schemas(key)
    return schemaKeyDefinitions.map((def) => {
      return this.resolveDefinitionForSchema(key, def, propList, functionContext)
    })
  }

  /**
   * Resolves the definition for one key in the schema
   *
   * @param key Generic or specific schema key
   * @param schemaKeyDefinition Unresolved definition as returned from simpleSchema.schema()
   * @param [propList] Array of schema properties you need; performance optimization
   * @param [functionContext] The context to use when evaluating schema options that are functions
   * @returns The schema definition for the requested key
   */
  resolveDefinitionForSchema (
    key: string,
    schemaKeyDefinition: StandardSchemaKeyDefinition,
    propList?: string[] | null,
    functionContext: Record<string, unknown> = {}
  ): StandardSchemaKeyDefinitionWithSimpleTypes {
    const getPropIterator = (obj: Record<string, any>, newObj: Record<string, any>) => {
      return (prop: string): void => {
        if (Array.isArray(propList) && !propList.includes(prop)) return
        const val = obj[prop]
        // For any options that support specifying a function, evaluate the functions
        if (
          propsThatCanBeFunction.includes(prop) &&
          typeof val === 'function'
        ) {
          newObj[prop] = val.call({
            key,
            ...functionContext
          })
          // Inflect label if undefined
          if (prop === 'label' && typeof newObj.label !== 'string') {
            newObj.label = inflectedLabel(
              key,
              this._constructorOptions.humanizeAutoLabels
            )
          }
        } else {
          newObj[prop] = val
        }
      }
    }

    const result: StandardSchemaKeyDefinitionWithSimpleTypes = {
      type: []
    }

    Object.keys(schemaKeyDefinition).forEach(getPropIterator(schemaKeyDefinition, result))

    // Resolve all the types and convert to a normal array to make it easier to use.
    if (Array.isArray(schemaKeyDefinition.type?.definitions)) {
      result.type = schemaKeyDefinition.type.definitions.map((typeDef) => {
        const newTypeDef: SchemaKeyDefinitionWithOneType = {
          type: String // will be overwritten
        }
        Object.keys(typeDef).forEach(getPropIterator(typeDef, newTypeDef))
        return newTypeDef
      })
    }

    return result
  }

  /**
   * Returns a string identifying the best guess data type for a key. For keys
   * that allow multiple types, the first type is used. This can be useful for
   * building forms.
   *
   * @param key Generic or specific schema key
   * @returns A type string. One of:
   *  string, number, boolean, date, object, stringArray, numberArray, booleanArray,
   *  dateArray, objectArray
   */
  getQuickTypeForKey (key: string): string | undefined {
    let type

    const fieldSchema = this.schema(key)
    if (fieldSchema == null) return

    const fieldType = (fieldSchema.type).singleType

    if (fieldType === String) {
      type = 'string'
    } else if (fieldType === Number || fieldType === SimpleSchema.Integer) {
      type = 'number'
    } else if (fieldType === Boolean) {
      type = 'boolean'
    } else if (fieldType === Date) {
      type = 'date'
    } else if (fieldType === Array) {
      const arrayItemFieldSchema = this.schema(`${key}.$`)
      if (arrayItemFieldSchema == null) return

      const arrayItemFieldType = (arrayItemFieldSchema.type).singleType
      if (arrayItemFieldType === String) {
        type = 'stringArray'
      } else if (
        arrayItemFieldType === Number ||
        arrayItemFieldType === SimpleSchema.Integer
      ) {
        type = 'numberArray'
      } else if (arrayItemFieldType === Boolean) {
        type = 'booleanArray'
      } else if (arrayItemFieldType === Date) {
        type = 'dateArray'
      } else if (
        arrayItemFieldType === Object ||
        SimpleSchema.isSimpleSchema(arrayItemFieldType)
      ) {
        type = 'objectArray'
      }
    } else if (fieldType === Object) {
      type = 'object'
    }

    return type
  }

  /**
   * Given a key that is an Object, returns a new SimpleSchema instance scoped to that object.
   *
   * @param key Generic or specific schema key
   */
  getObjectSchema (key: string): SimpleSchema {
    const newSchemaDef: SchemaDefinition = {}
    const genericKey = MongoObject.makeKeyGeneric(key)
    if (genericKey == null) throw new Error(`Unable to make a generic key for ${key}`)
    const searchString = `${genericKey}.`

    const mergedSchema = this.mergedSchema()
    Object.keys(mergedSchema).forEach((k) => {
      if (k.indexOf(searchString) === 0) {
        newSchemaDef[k.slice(searchString.length)] = mergedSchema[k]
      }
    })

    return this._copyWithSchema(newSchemaDef)
  }

  // Returns an array of all the autovalue functions, including those in subschemas all the
  // way down the schema tree
  autoValueFunctions (): AutoValueFunctionDetails[] {
    const result: AutoValueFunctionDetails[] = [...this._autoValues]

    this._schemaKeys.forEach((key) => {
      this._schema[key].type.definitions.forEach((typeDef) => {
        if (!SimpleSchema.isSimpleSchema(typeDef.type)) return
        result.push(
          ...(typeDef.type as SimpleSchema)
            .autoValueFunctions()
            .map(({ func, fieldName, closestSubschemaFieldName }) => {
              return {
                func,
                fieldName: `${key}.${fieldName}`,
                closestSubschemaFieldName: closestSubschemaFieldName.length > 0
                  ? `${key}.${closestSubschemaFieldName}`
                  : key
              }
            })
        )
      })
    })

    return result
  }

  // Returns an array of all the blackbox keys, including those in subschemas
  blackboxKeys (): string[] {
    const blackboxKeys = new Set(this._blackboxKeys)

    this._schemaKeys.forEach((key) => {
      this._schema[key].type.definitions.forEach((typeDef) => {
        if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
        (typeDef.type as SimpleSchema).blackboxKeys().forEach((blackboxKey) => {
          blackboxKeys.add(`${key}.${blackboxKey}`)
        })
      })
    })

    return Array.from(blackboxKeys)
  }

  /**
   * Check if the key is a nested dot-syntax key inside of a blackbox object
   * @param key Key to check
   * @returns True if key is in a black box object
   */
  keyIsInBlackBox (key: string): boolean {
    const genericKey = MongoObject.makeKeyGeneric(key)
    if (genericKey == null) return false

    let isInBlackBox = false
    forEachKeyAncestor(
      genericKey,
      (ancestor, remainder) => {
        if (this._blackboxKeys.has(ancestor)) {
          isInBlackBox = true
        } else {
          const testKeySchema = this.schema(ancestor)
          if (testKeySchema != null) {
            testKeySchema.type.definitions.forEach((typeDef) => {
              if (!SimpleSchema.isSimpleSchema(typeDef.type)) return
              if ((typeDef.type as SimpleSchema).keyIsInBlackBox(remainder)) isInBlackBox = true
            })
          }
        }
      }
    )
    return isInBlackBox
  }

  // Returns true if key is explicitly allowed by the schema or implied
  // by other explicitly allowed keys.
  // The key string should have $ in place of any numeric array positions.
  allowsKey (key: string): boolean {
    // Loop through all keys in the schema
    return this._schemaKeys.some((loopKey) => {
      // If the schema key is the test key, it's allowed.
      if (loopKey === key) return true

      const compare1 = key.slice(0, loopKey.length + 2)
      const compare2 = compare1.slice(0, -1)

      // Blackbox and subschema checks are needed only if key starts with
      // loopKey + a dot
      if (compare2 !== `${loopKey}.`) return false

      // Black box handling
      if (this._blackboxKeys.has(loopKey)) {
        // If the test key is the black box key + ".$", then the test
        // key is NOT allowed because black box keys are by definition
        // only for objects, and not for arrays.
        return compare1 !== `${loopKey}.$`
      }

      // Subschemas
      let allowed = false
      const subKey = key.slice(loopKey.length + 1)
      this.schema(loopKey)?.type.definitions.forEach((typeDef) => {
        if (!SimpleSchema.isSimpleSchema(typeDef.type)) return
        if ((typeDef.type as SimpleSchema).allowsKey(subKey)) allowed = true
      })
      return allowed
    })
  }

  /**
   * Returns all the child keys for the object identified by the generic prefix,
   * or all the top level keys if no prefix is supplied.
   *
   * @param [keyPrefix] The Object-type generic key for which to get child keys. Omit for
   *   top-level Object-type keys
   * @returns Array of child keys for the given object key
   */
  objectKeys (keyPrefix?: string): string[] {
    if (keyPrefix == null) return this._firstLevelSchemaKeys

    const objectKeys: Record<string, string[]> = {}
    const setObjectKeys = (curSchema: ResolvedSchemaDefinition, schemaParentKey?: string): void => {
      Object.keys(curSchema).forEach((fieldName) => {
        const definition = curSchema[fieldName]
        fieldName = schemaParentKey != null ? `${schemaParentKey}.${fieldName}` : fieldName
        if (fieldName.includes('.') && fieldName.slice(-2) !== '.$') {
          const parentKey = fieldName.slice(0, fieldName.lastIndexOf('.'))
          const parentKeyWithDot = `${parentKey}.`
          objectKeys[parentKeyWithDot] = objectKeys[parentKeyWithDot] ?? []
          objectKeys[parentKeyWithDot].push(fieldName.slice(fieldName.lastIndexOf('.') + 1))
        }

        // If the current field is a nested SimpleSchema,
        // iterate over the child fields and cache their properties as well
        definition.type.definitions.forEach(({ type }) => {
          if (SimpleSchema.isSimpleSchema(type)) {
            setObjectKeys((type as SimpleSchema)._schema, fieldName)
          }
        })
      })
    }

    setObjectKeys(this._schema)

    return objectKeys[`${keyPrefix}.`] ?? []
  }

  /**
   * Copies this schema into a new instance with the same validators, messages,
   * and options, but with different keys as defined in `schema` argument
   *
   * @param schema
   * @returns The new SimpleSchema instance (chainable)
   */
  _copyWithSchema (schema: SchemaDefinition): SimpleSchema {
    const cl = new SimpleSchema(schema, { ...this._constructorOptions })
    cl._cleanOptions = this._cleanOptions
    return cl
  }

  /**
   * Clones this schema into a new instance with the same schema keys, validators,
   * and options.
   *
   * @returns The new SimpleSchema instance (chainable)
   */
  clone (): SimpleSchema {
    return this._copyWithSchema(this._schema)
  }

  /**
   * Extends (mutates) this schema with another schema, key by key.
   *
   * @param schema The schema or schema definition to extend onto this one
   * @returns The SimpleSchema instance (chainable)
   */
  extend (schema: SimpleSchema | PartialSchemaDefinitionWithShorthand = {}): SimpleSchema {
    if (Array.isArray(schema)) {
      throw new Error(
        'You may not pass an array of schemas to the SimpleSchema constructor or to extend()'
      )
    }

    let schemaObj: SchemaDefinition
    if (SimpleSchema.isSimpleSchema(schema)) {
      schemaObj = (schema as SimpleSchema)._schema
      this._validators = this._validators.concat((schema as SimpleSchema)._validators)
      this._docValidators = this._docValidators.concat((schema as SimpleSchema)._docValidators)
      Object.assign(this._cleanOptions, (schema as SimpleSchema)._cleanOptions)
      Object.assign(this._constructorOptions, (schema as SimpleSchema)._constructorOptions)
    } else {
      schemaObj = expandShorthand(schema as SchemaDefinitionWithShorthand)
    }

    const schemaKeys = Object.keys(schemaObj)
    const combinedKeys = new Set([...Object.keys(this._schema), ...schemaKeys])

    // Update all of the information cached on the instance
    schemaKeys.forEach((fieldName) => {
      const definition = standardizeDefinition(schemaObj[fieldName])

      // Merge/extend with any existing definition
      if (this._schema[fieldName] != null) {
        if (!Object.prototype.hasOwnProperty.call(this._schema, fieldName)) {
          // fieldName is actually a method from Object itself!
          throw new Error(
            `${fieldName} key is actually the name of a method on Object, please rename it`
          )
        }

        const { type, ...definitionWithoutType } = definition // eslint-disable-line no-unused-vars

        this._schema[fieldName] = {
          ...this._schema[fieldName],
          ...definitionWithoutType
        }

        if (definition.type != null) { this._schema[fieldName].type.extend(definition.type) }
      } else {
        this._schema[fieldName] = definition
      }

      checkAndScrubDefinition(
        fieldName,
        this._schema[fieldName],
        this._constructorOptions,
        combinedKeys
      )
    })

    checkSchemaOverlap(this._schema)

    // Set/Reset all of these
    this._schemaKeys = Object.keys(this._schema)
    this._autoValues = []
    this._blackboxKeys = new Set()
    this._firstLevelSchemaKeys = []

    // Update all of the information cached on the instance
    this._schemaKeys.forEach((fieldName) => {
      // Make sure parent has a definition in the schema. No implied objects!
      if (fieldName.includes('.')) {
        const parentFieldName = fieldName.slice(0, fieldName.lastIndexOf('.'))
        if (
          !Object.prototype.hasOwnProperty.call(this._schema, parentFieldName)
        ) {
          throw new Error(
            `"${fieldName}" is in the schema but "${parentFieldName}" is not`
          )
        }
      }

      const definition = this._schema[fieldName]

      // Keep list of all top level keys
      if (!fieldName.includes('.')) { this._firstLevelSchemaKeys.push(fieldName) }

      // Keep list of all blackbox keys for passing to MongoObject constructor
      // XXX For now if any oneOf type is blackbox, then the whole field is.
      /* eslint-disable no-restricted-syntax */
      for (const oneOfDef of definition.type.definitions) {
        // XXX If the type is SS.Any, also consider it a blackbox
        if (oneOfDef.blackbox === true || oneOfDef.type === SimpleSchema.Any) {
          this._blackboxKeys.add(fieldName)
          break
        }
      }
      /* eslint-enable no-restricted-syntax */

      // Keep list of autoValue functions
      if (typeof definition.autoValue === 'function') {
        this._autoValues.push({
          closestSubschemaFieldName: '',
          fieldName,
          func: definition.autoValue
        })
      }
    })

    return this
  }

  getAllowedValuesForKey (key: string): any[] | null {
    // For array fields, `allowedValues` is on the array item definition
    if (this.allowsKey(`${key}.$`)) {
      key = `${key}.$`
    }
    const allowedValues = this.get(key, 'allowedValues')

    if (Array.isArray(allowedValues) || allowedValues instanceof Set) {
      return [...allowedValues]
    }

    return null
  }

  newContext (): ValidationContext {
    return new ValidationContext(this)
  }

  namedContext (name?: string): ValidationContext {
    if (typeof name !== 'string') name = 'default'
    if (this._validationContexts[name] == null) {
      this._validationContexts[name] = new ValidationContext(this, name)
    }
    return this._validationContexts[name]
  }

  addValidator (func: ValidatorFunction): void {
    this._validators.push(func)
  }

  addDocValidator (func: DocValidatorFunction): void {
    this._docValidators.push(func)
  }

  /**
   * @param obj Object or array of objects to validate.
   * @param options Same options object that ValidationContext#validate takes
   *
   * Throws an Error with name `ClientError` and `details` property containing the errors.
   */
  validate (obj: any, options: ValidationOptions = {}): void {
    // obj can be an array, in which case we validate each object in it and
    // throw as soon as one has an error
    const objects = Array.isArray(obj) ? obj : [obj]
    objects.forEach((oneObj) => {
      const validationContext = this.newContext()
      const isValid = validationContext.validate(oneObj, options)

      if (isValid) return

      const errors = validationContext.validationErrors()

      // In order for the message at the top of the stack trace to be useful,
      // we set it to the first validation error message.
      const message = this.messageForError(errors[0])

      const error = new ClientError<ValidationError[]>(message, 'validation-error')

      // Add meaningful error messages for each validation error.
      // Useful for display messages when using 'mdg:validated-method'.
      error.details = errors.map((errorDetail) => ({
        ...errorDetail,
        message: this.messageForError(errorDetail)
      }))

      // The primary use for the validationErrorTransform is to convert the
      // vanilla Error into a Meteor.Error until DDP is able to pass
      // vanilla errors back to the client.
      if (typeof SimpleSchema.validationErrorTransform === 'function') {
        throw SimpleSchema.validationErrorTransform(error)
      } else {
        throw error
      }
    })
  }

  /**
   * @param obj Object to validate.
   * @param options Same options object that ValidationContext#validate takes
   *
   * Returns a Promise that resolves with the errors
   */
  async validateAndReturnErrorsPromise (
    obj: any,
    options: ValidationOptions
  ): Promise<ValidationError[]> {
    const validationContext = this.newContext()
    const isValid = validationContext.validate(obj, options)

    if (isValid) return []

    // Add the `message` prop
    return validationContext.validationErrors().map((errorDetail) => {
      return { ...errorDetail, message: this.messageForError(errorDetail) }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  validator (options: ValidationOptions & { clean?: boolean, returnErrorsPromise?: boolean } = {}): (obj: Record<string, any>) => void | Promise<ValidationError[]> {
    return (obj: Record<string, any>) => {
      const optionsClone = { ...options }
      if (options.clean === true) {
        // Do this here and pass into both functions for better performance
        optionsClone.mongoObject = new MongoObject(obj, this.blackboxKeys())
        this.clean(obj, optionsClone)
      }
      if (options.returnErrorsPromise === true) {
        return this.validateAndReturnErrorsPromise(obj, optionsClone)
      }
      return this.validate(obj, optionsClone)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  getFormValidator (options = {}): (obj: Record<string, any>) => void | Promise<ValidationError[]> {
    return this.validator({ ...options, returnErrorsPromise: true })
  }

  clean (doc: Record<string | number | symbol, unknown>, options: CleanOptions = {}): Record<string | number | symbol, unknown> {
    return clean(this, doc, options)
  }

  /**
   * Change schema labels on the fly. Useful when the user changes the language.
   *
   * @param labels A dictionary of all the new label values, by schema key.
   */
  labels (labels: Record<string, string | (() => string)>): void {
    for (const [key, label] of Object.entries(labels)) {
      if (typeof label !== 'string' && typeof label !== 'function') continue

      // Support setting labels that were actually originally defined in a sub-schema
      const [schemaInstance, innerKey] = this.nearestSimpleSchemaInstance(key)
      if (schemaInstance == null || innerKey == null) continue
      schemaInstance._schema[innerKey].label = label
    }
  }

  /**
   * Gets a field's label or all field labels reactively.
   *
   * @param key The schema key, specific or generic.
   *   Omit this argument to get a dictionary of all labels.
   * @returns The label
   */
  label (): Record<string, string>
  label (key: string): string | null
  label (key?: string): Record<string, string> | string | null {
    // Get all labels
    if (key === null || key === undefined) {
      const result: Record<string, string> = {}
      this._schemaKeys.forEach((schemaKey) => {
        result[schemaKey] = this.label(schemaKey) as string
      })
      return result
    }

    // Get label for one field
    const label = this.get(key, 'label') as string
    return label ?? null
  }

  /**
   * Gets a field's property
   *
   * @param key The schema key, specific or generic.
   * @param prop Name of the property to get for that schema key
   * @param functionContext The `this` context to use if prop is a function
   * @returns The property value
   */
  get (
    key: string,
    prop: keyof StandardSchemaKeyDefinitionWithSimpleTypes | keyof StandardSchemaKeyDefinition,
    functionContext?: Record<string, unknown>
  ): any {
    const def = this.getDefinition(key, ['type', prop], functionContext)

    if (def == null) return undefined

    if (schemaDefinitionOptions.includes(prop)) {
      return def[prop as keyof StandardSchemaKeyDefinitionWithSimpleTypes]
    }

    const oneType = def.type[0]
    if (oneType === SimpleSchema.Any) return undefined

    return (oneType as SchemaKeyDefinitionWithOneType)?.[prop as keyof StandardSchemaKeyDefinition]
  }

  // shorthand for getting defaultValue
  defaultValue (key: string): unknown {
    return this.get(key, 'defaultValue')
  }

  // Returns a string message for the given error type and key.
  // Defers to a user-provided getErrorMessage function, which
  // can do custom messages and translations, or falls back to
  // built-in English defaults.
  messageForError (errorInfo: ValidationError): string {
    const { name } = errorInfo

    const label = this.label(name)

    let message: string | undefined
    if (this._constructorOptions.getErrorMessage !== undefined) {
      message = this._constructorOptions.getErrorMessage(errorInfo, label)
      if (message !== undefined) return message
    }

    if (globalThis.simpleSchemaGlobalConfig?.getErrorMessage !== undefined) {
      message = globalThis.simpleSchemaGlobalConfig?.getErrorMessage(errorInfo, label)
      if (message !== undefined) return message
    }

    return getDefaultErrorMessage(errorInfo, label)
  }

  /**
   * @method SimpleSchema#pick
   * @param {[fields]} The list of fields to pick to instantiate the subschema
   * @returns {SimpleSchema} The subschema
   */
  pick = getPickOrOmit('pick')

  /**
   * @method SimpleSchema#omit
   * @param {[fields]} The list of fields to omit to instantiate the subschema
   * @returns {SimpleSchema} The subschema
   */
  omit = getPickOrOmit('omit')

  /**
   * If you need to allow properties other than those listed above, call this from your app or package
   * @param options Additional allowed options
   */
  static extendOptions (options: string[]): void {
    schemaDefinitionOptions.push(...options)
  }

  static defineValidationErrorTransform (transform: (error: ClientError<ValidationError[]>) => Error): void {
    if (typeof transform !== 'function') {
      throw new Error(
        'SimpleSchema.defineValidationErrorTransform must be passed a function that accepts an Error and returns an Error'
      )
    }
    SimpleSchema.validationErrorTransform = transform
  }

  static validate (obj: any, schema: SimpleSchema | SchemaDefinitionWithShorthand, options?: ValidationOptions): void {
    // Allow passing just the schema object
    if (!SimpleSchema.isSimpleSchema(schema)) {
      schema = new SimpleSchema(schema as SchemaDefinitionWithShorthand)
    }

    return (schema as SimpleSchema).validate(obj, options)
  }

  static oneOf (...definitions: Array<SchemaKeyDefinitionWithOneType | SupportedTypes | RegExpConstructor>): SimpleSchemaGroup {
    return new SimpleSchemaGroup(...definitions)
  }

  static Any = '___Any___'

  static addValidator (func: ValidatorFunction): void {
    SimpleSchema._validators.push(func)
  }

  static addDocValidator (func: DocValidatorFunction): void {
    SimpleSchema._docValidators.push(func)
  }

  /**
   * @summary Get/set default values for SimpleSchema constructor options
   */
  static constructorOptionDefaults (options?: SimpleSchemaOptions): undefined | SimpleSchemaOptions {
    if (options == null) return SimpleSchema._constructorOptionDefaults

    SimpleSchema._constructorOptionDefaults = {
      ...SimpleSchema._constructorOptionDefaults,
      ...options,
      clean: {
        ...SimpleSchema._constructorOptionDefaults.clean,
        ...(options.clean ?? {})
      }
    }
  }

  static ErrorTypes = {
    REQUIRED: 'required',
    MIN_STRING: 'minString',
    MAX_STRING: 'maxString',
    MIN_NUMBER: 'minNumber',
    MAX_NUMBER: 'maxNumber',
    MIN_NUMBER_EXCLUSIVE: 'minNumberExclusive',
    MAX_NUMBER_EXCLUSIVE: 'maxNumberExclusive',
    MIN_DATE: 'minDate',
    MAX_DATE: 'maxDate',
    BAD_DATE: 'badDate',
    MIN_COUNT: 'minCount',
    MAX_COUNT: 'maxCount',
    MUST_BE_INTEGER: 'noDecimal',
    VALUE_NOT_ALLOWED: 'notAllowed',
    EXPECTED_TYPE: 'expectedType',
    FAILED_REGULAR_EXPRESSION: 'regEx',
    KEY_NOT_IN_SCHEMA: 'keyNotInSchema'
  }

  static Integer = 'SimpleSchema.Integer'

  static ValidationContext = ValidationContext
}

/*
 * PRIVATE
 */

// Throws an error if any fields are `type` SimpleSchema but then also
// have subfields defined outside of that.
function checkSchemaOverlap (schema: ResolvedSchemaDefinition): void {
  Object.keys(schema).forEach((key) => {
    const val = schema[key]
    if (val.type == null) throw new Error(`${key} key is missing "type"`)
    val.type.definitions.forEach((def) => {
      if (!SimpleSchema.isSimpleSchema(def.type)) return

      // @ts-expect-error
      Object.keys((def.type as SimpleSchema)._schema).forEach((subKey) => {
        const newKey = `${key}.${subKey}`
        if (Object.prototype.hasOwnProperty.call(schema, newKey)) {
          throw new Error(
            `The type for "${key}" is set to a SimpleSchema instance that defines "${key}.${subKey}", but the parent SimpleSchema instance also tries to define "${key}.${subKey}"`
          )
        }
      })
    })
  })
}

/**
 * @param fieldName The full generic schema key
 * @param shouldHumanize Humanize it
 * @returns A label based on the key
 */
function inflectedLabel (fieldName: string, shouldHumanize = false): string {
  const pieces = fieldName.split('.')
  let label
  do {
    label = pieces.pop()
  } while (label === '$' && (pieces.length > 0))
  return (label != null && shouldHumanize) ? humanize(label) : (label ?? '')
}

function getDefaultAutoValueFunction (defaultValue: any) {
  return function defaultAutoValueFunction (this: AutoValueContext) {
    if (this.isSet) return
    if (this.operator === null) return defaultValue

    // Handle the case when pulling an object from an array the object contains a field
    // which has a defaultValue. We don't want the default value to be returned in this case
    if (this.operator === '$pull') return

    // Handle the case where we are $pushing an object into an array of objects and we
    // want any fields missing from that object to be added if they have default values
    if (this.operator === '$push') return defaultValue

    // If parent is set, we should update this position instead of $setOnInsert
    if (this.parentField().isSet) return defaultValue

    // Make sure the default value is added on upsert insert
    if (this.isUpsert) return { $setOnInsert: defaultValue }
  }
}

// Mutates def into standardized object with SimpleSchemaGroup type
function standardizeDefinition (def: SchemaKeyDefinition): StandardSchemaKeyDefinition {
  const standardizedDef: Partial<StandardSchemaKeyDefinition> = {}
  for (const prop of Object.keys(def)) {
    if (!oneOfProps.includes(prop)) {
      // @ts-expect-error Copying properties
      standardizedDef[prop] = def[prop]
    }
  }

  // Internally, all definition types are stored as groups for simplicity of access.
  // If we are extending, there may not actually be def.type, but it's okay because
  // it will be added later when the two SimpleSchemaGroups are merged.
  if (def.type instanceof SimpleSchemaGroup) {
    standardizedDef.type = def.type.clone()
  } else {
    const groupProps: Partial<SchemaKeyDefinitionWithOneType> = {}
    for (const prop of Object.keys(def)) {
      if (oneOfProps.includes(prop)) {
        // @ts-expect-error Copying properties
        groupProps[prop] = def[prop]
      }
    }
    standardizedDef.type = new SimpleSchemaGroup(groupProps as SchemaKeyDefinitionWithOneType)
  }

  return standardizedDef as StandardSchemaKeyDefinition
}

/**
 * @summary Checks and mutates definition. Clone it first.
 *   Throws errors if any problems are found.
 * @param fieldName Name of field / key
 * @param definition Field definition
 * @param options Options
 * @param allKeys Set of all field names / keys in entire schema
 */
function checkAndScrubDefinition (
  fieldName: string,
  definition: StandardSchemaKeyDefinition,
  options: SimpleSchemaOptions,
  allKeys: Set<string>
): void {
  if (definition.type == null) throw new Error(`${fieldName} key is missing "type"`)

  // Validate the field definition
  Object.keys(definition).forEach((key) => {
    if (!schemaDefinitionOptions.includes(key)) {
      throw new Error(
        `Invalid definition for ${fieldName} field: "${key}" is not a supported property`
      )
    }
  })

  // Make sure the `type`s are OK
  let couldBeArray = false
  definition.type.definitions.forEach(({ type }) => {
    if (type == null) {
      throw new Error(
        `Invalid definition for ${fieldName} field: "type" option is required`
      )
    }

    if (Array.isArray(type)) {
      throw new Error(
        `Invalid definition for ${fieldName} field: "type" may not be an array. Change it to Array.`
      )
    }

    if (type.constructor === Object && isEmptyObject(type as unknown as {})) {
      throw new Error(
        `Invalid definition for ${fieldName} field: "type" may not be an object. Change it to Object`
      )
    }

    if (type === Array) couldBeArray = true

    if (SimpleSchema.isSimpleSchema(type)) {
      // @ts-expect-error
      Object.keys((type as SimpleSchema)._schema).forEach((subKey) => {
        const newKey = `${fieldName}.${subKey}`
        if (allKeys.has(newKey)) {
          throw new Error(
            `The type for "${fieldName}" is set to a SimpleSchema instance that defines "${newKey}", but the parent SimpleSchema instance also tries to define "${newKey}"`
          )
        }
      })
    }
  })

  // If at least one of the possible types is Array, then make sure we have a
  // definition for the array items, too.
  if (couldBeArray && !allKeys.has(`${fieldName}.$`)) {
    throw new Error(
      `"${fieldName}" is Array type but the schema does not include a "${fieldName}.$" definition for the array items"`
    )
  }

  // defaultValue -> autoValue
  // We support defaultValue shortcut by converting it immediately into an
  // autoValue.

  if ('defaultValue' in definition) {
    if ('autoValue' in definition && definition.autoValue?.isDefault !== true) {
      console.warn(
        `SimpleSchema: Found both autoValue and defaultValue options for "${fieldName}". Ignoring defaultValue.`
      )
    } else {
      if (fieldName.endsWith('.$')) {
        throw new Error(
          'An array item field (one that ends with ".$") cannot have defaultValue.'
        )
      }
      definition.autoValue = getDefaultAutoValueFunction(
        definition.defaultValue
      )
      definition.autoValue.isDefault = true
    }
  }

  // REQUIREDNESS
  if (fieldName.endsWith('.$')) {
    definition.optional = true
  } else if (!Object.prototype.hasOwnProperty.call(definition, 'optional')) {
    if (Object.prototype.hasOwnProperty.call(definition, 'required')) {
      if (typeof definition.required === 'function') {
        // Save a reference to the `required` fn because
        // we are going to delete it from `definition` below
        const requiredFn = definition.required
        definition.optional = function optional (...args) {
          return !requiredFn.apply(this, args)
        }
      } else {
        definition.optional = definition.required !== true
      }
    } else {
      definition.optional = options.requiredByDefault === false
    }
  }

  delete definition.required

  // LABELS
  if (!Object.prototype.hasOwnProperty.call(definition, 'label')) {
    if (options.defaultLabel != null) {
      definition.label = options.defaultLabel
    } else if (SimpleSchema.defaultLabel != null) {
      definition.label = SimpleSchema.defaultLabel
    } else {
      definition.label = inflectedLabel(fieldName, options.humanizeAutoLabels)
    }
  }
}

function getPickOrOmit (type: SupportedTypes) {
  return function pickOrOmit (this: SimpleSchema, ...args: string[]) {
    // If they are picking/omitting an object or array field, we need to also include everything under it
    const newSchema: SchemaDefinition = {}
    // @ts-expect-error
    this._schemaKeys.forEach((key) => {
      // Pick/omit it if it IS in the array of keys they want OR if it
      // STARTS WITH something that is in the array plus a period
      const includeIt = args.some(
        (wantedField) =>
          key === wantedField || key.indexOf(`${wantedField}.`) === 0
      )

      if ((includeIt && type === 'pick') || (!includeIt && type === 'omit')) {
        // @ts-expect-error
        newSchema[key] = this._schema[key]
      }
    })

    return this._copyWithSchema(newSchema)
  }
}

export { SimpleSchema, ValidationContext }
