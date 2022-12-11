import MongoObject from 'mongo-object'

import { SimpleSchema } from './SimpleSchema.js'
import SimpleSchemaGroup from './SimpleSchemaGroup.js'
import ValidationContext from './ValidationContext.js'

export interface GlobalConfig {
  getErrorMessage?: GetErrorMessageFn
}

declare global {
  // eslint-disable-next-line no-var
  var simpleSchemaGlobalConfig: GlobalConfig
}

export type AllowedValues = any[] | Set<any>

export type ValueOrFunctionThatReturnsValue<T> = T | (() => T)

export interface AutoValueFunction {
  (this: AutoValueContext, obj: any): any
  isDefault?: boolean
}

export interface AutoValueFunctionDetails {
  closestSubschemaFieldName: string
  fieldName: string
  func: AutoValueFunction
}

export type CustomAutoValueContext = Record<string, unknown>
export type CustomValidatorContext = Record<string, unknown>

export interface CleanOptions {
  /**
   * Should cleaning try to automatically convert the type of values to match the type expected by the schema?
   * @default true
   */
  autoConvert?: boolean
  /**
   * This object will be added to the `this` context of autoValue functions.
   */
  extendAutoValueContext?: CustomAutoValueContext
  /**
   * Should cleaning delete any properties of the object that are not present in the schema?
   * @default true
   */
  filter?: boolean
  /**
   * Should cleaning use defaultValue and autoValue functions to automatically add values for some fields?
   * @default true
   */
  getAutoValues?: boolean
  /**
   * Is the object being cleaned a MongoDB modifier document?
   * @default false
   */
  isModifier?: boolean
  /**
   * Will the modifier object being cleaned be used to do an upsert? This is used
   * to determine whether $setOnInsert should be added to it for default values.
   * @default false
   */
  isUpsert?: boolean
  /**
   * If you already have the MongoObject instance, pass it to improve performance.
   */
  mongoObject?: MongoObject
  /**
   * Should cleaning mutate the input object? Set this to true to improve performance if you don't mind mutating the object you're cleaning.
   */
  mutate?: boolean
  /**
   * Should cleaning remove keys in a normal object or a $set object where the value is an empty string?
   * @default true
   */
  removeEmptyStrings?: boolean
  /**
   * Should cleaning remove all null items from all arrays? Set to true only if you don't have any sparse arrays.
   * @default false
   */
  removeNullsFromArrays?: boolean
  /**
   * Should cleaning remove whitespace characters from the beginning and end of all strings?
   * @default true
   */
  trimStrings?: boolean
}

export interface NodeContext {
  genericKey: string
  isArrayItem: boolean
  operator: string
  position: string
  remove: () => void
  updateValue: (newValue: any) => void
  value: any
}

export type GetErrorMessageFn = (error: ValidationError, label: string | null) => string | undefined

export interface SimpleSchemaOptions {
  clean?: CleanOptions
  defaultLabel?: string
  getErrorMessage?: GetErrorMessageFn
  humanizeAutoLabels?: boolean
  keepRawDefinition?: boolean
  requiredByDefault?: boolean
}

export interface TypeDefinitionProps {
  allowedValues?: AllowedValues | (() => AllowedValues)
  blackbox?: boolean
  custom?: ValidatorFunction
  exclusiveMax?: boolean
  exclusiveMin?: boolean
  maxCount?: number
  max?: number | Date | (() => number | Date)
  minCount?: number
  min?: number | Date | (() => number | Date)
  regEx?: RegExp | RegExp[]
  skipRegExCheckForEmptyStrings?: boolean
  trim?: boolean
}

export interface FunctionOptionContext {
  key?: string | null
  [prop: string]: unknown
}

export interface SchemaKeyDefinitionBase extends TypeDefinitionProps {
  autoValue?: AutoValueFunction
  defaultValue?: any
  label?: string | ((this: FunctionOptionContext) => string)
  optional?: boolean | (() => boolean)
  required?: boolean | (() => boolean)
}

export interface SchemaKeyDefinitionWithOneType extends SchemaKeyDefinitionBase {
  type: SupportedTypes
}

export interface StandardSchemaKeyDefinition extends SchemaKeyDefinitionBase {
  type: SimpleSchemaGroup
}

export interface StandardSchemaKeyDefinitionWithSimpleTypes extends SchemaKeyDefinitionBase {
  type: Array<SchemaKeyDefinitionWithOneType | '___Any___'>
}

export type SchemaKeyDefinition = StandardSchemaKeyDefinition | SchemaKeyDefinitionWithOneType
export type SchemaKeyDefinitionWithShorthand = StandardSchemaKeyDefinition | SchemaKeyDefinitionWithOneType | SupportedTypes | RegExpConstructor | SimpleSchemaGroup | SupportedTypes[]
export type PartialSchemaKeyDefinitionWithShorthand = StandardSchemaKeyDefinition | Partial<SchemaKeyDefinitionWithOneType> | SupportedTypes | RegExpConstructor | SimpleSchemaGroup | SupportedTypes[]

export type SchemaDefinition = Record<string, SchemaKeyDefinition>
export type SchemaDefinitionWithShorthand = Record<string, SchemaKeyDefinitionWithShorthand>
export type PartialSchemaDefinitionWithShorthand = Record<string, PartialSchemaKeyDefinitionWithShorthand>
export type ResolvedSchemaDefinition = Record<string, StandardSchemaKeyDefinition>

export type AnyClass = new (...args: any[]) => any

export type SupportedTypes =
  | ArrayConstructor
  | BooleanConstructor
  | DateConstructor
  | NumberConstructor
  | StringConstructor
  | ObjectConstructor
  | '___Any___'
  | typeof SimpleSchema.Integer
  | SimpleSchema
  | AnyClass
  | RegExp

export interface ValidationError {
  message?: string
  name: string
  type: string
  value: any
  [prop: string]: any
}

export interface ValidationErrorResult {
  message?: string
  name?: string
  type: string
  value?: any
  [prop: string]: any
}

export interface ValidationOptions {
  extendedCustomContext?: Record<string | number | symbol, unknown>
  ignore?: string[]
  keys?: string[]
  modifier?: boolean
  mongoObject?: any
  upsert?: boolean
}

export interface FieldInfo<ValueType> {
  isSet: boolean
  operator: string | null
  value: ValueType
}

export interface CommonContext {
  field: <ValueType>(fieldName: string) => FieldInfo<ValueType>
  isModifier: boolean
  isSet: boolean
  key: string
  operator: string | null
  parentField: <ValueType>() => FieldInfo<ValueType>
  siblingField: <ValueType>(fieldName: string) => FieldInfo<ValueType>
  value: any
}

export interface AutoValueContext extends CommonContext, CustomAutoValueContext {
  closestSubschemaFieldName: string | null
  isUpsert: boolean
  unset: () => void
}

export interface TypeValidatorContext {
  definition: SchemaKeyDefinition
  operator: string | null
  value: any
  valueShouldBeChecked: boolean
}

export interface ValidatorContext extends CommonContext, CustomValidatorContext {
  addValidationErrors: (errors: ValidationError[]) => void
  definition: SchemaKeyDefinition
  field: <ValueType>(fieldName: string) => FieldInfo<ValueType>
  genericKey: string
  isInArrayItemObject: boolean
  isInSubObject: boolean
  obj: any
  validationContext: ValidationContext
  valueShouldBeChecked: boolean
}

export interface DocValidatorContext extends CustomValidatorContext {
  ignoreTypes?: string[]
  isModifier: boolean
  isUpsert: boolean
  keysToValidate?: string[]
  mongoObject?: MongoObject
  obj: any
  schema: SimpleSchema
  validationContext: ValidationContext
}

export type FunctionPropContext = Omit<ValidatorContext, 'addValidationErrors' | 'valueShouldBeChecked'>

export type DocValidatorFunction = (this: DocValidatorContext, obj: Record<string, unknown>) => ValidationError[]
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ValidatorFunction = (this: ValidatorContext) => void | undefined | boolean | string | ValidationErrorResult

export type ObjectToValidate = Record<string | number | symbol, unknown> | AnyClass
