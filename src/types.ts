import MongoObject from 'mongo-object'

import { SimpleSchema } from './SimpleSchema.js'
import SimpleSchemaGroup from './SimpleSchemaGroup.js'
import ValidationContext from './ValidationContext.js'

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
  autoConvert?: boolean
  extendAutoValueContext?: CustomAutoValueContext
  filter?: boolean
  getAutoValues?: boolean
  isModifier?: boolean
  isUpsert?: boolean
  mongoObject?: MongoObject
  mutate?: boolean
  removeEmptyStrings?: boolean
  removeNullsFromArrays?: boolean
  trimStrings?: boolean
}

export interface SimpleSchemaOptions {
  clean?: CleanOptions
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
  regEx?: RegExp
  skipRegExCheckForEmptyStrings?: boolean
  trim?: boolean
}

export interface SchemaKeyTypeDefinition extends TypeDefinitionProps {
  type: SupportedTypes
}

export type SchemaKeyTypeDefinitionWithShorthand = SchemaKeyTypeDefinition | SupportedTypes | RegExpConstructor | SimpleSchemaGroup

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
  type: Array<(SchemaKeyTypeDefinition & { type: SupportedTypes }) | '___Any___'>
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
}

export interface ValidationErrorResult {
  name?: string
  type: string
  value?: any
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

export type DocValidatorFunction = (this: DocValidatorContext, obj: Record<string, any>) => ValidationError[]
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ValidatorFunction = (this: ValidatorContext) => void | undefined | boolean | string | ValidationErrorResult

export type ObjectToValidate = Record<string | number | symbol, unknown> | AnyClass
