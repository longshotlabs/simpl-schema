import MongoObject from "mongo-object";

import ValidationContext from "./ValidationContext.js";
import { SimpleSchema } from "./SimpleSchema.js";
import SimpleSchemaGroup from "./SimpleSchemaGroup.js";

export type AllowedValues = any[] | Set<any>;

export type ValueOrFunctionThatReturnsValue<T> = T | (() => T)

export interface AutoValueFunction {
  (this: AutoValueContext, obj: any): any;
  isDefault?: boolean;
}

export interface AutoValueFunctionDetails {
  closestSubschemaFieldName: string;
  fieldName: string;
  func: AutoValueFunction;
}

export type CustomAutoValueContext = Record<string, unknown>;
export type CustomValidatorContext = Record<string, unknown>;

export interface CleanOptions {
  autoConvert?: boolean;
  extendAutoValueContext?: CustomAutoValueContext;
  filter?: boolean;
  getAutoValues?: boolean;
  isModifier?: boolean;
  isUpsert?: boolean;
  mongoObject?: MongoObject;
  mutate?: boolean;
  removeEmptyStrings?: boolean;
  removeNullsFromArrays?: boolean;
  trimStrings?: boolean;
}

export interface SimpleSchemaOptions {
  clean?: CleanOptions;
  humanizeAutoLabels?: boolean;
  keepRawDefinition?: boolean;
  requiredByDefault?: boolean;
}

export interface TypeDefinitionProps {
  allowedValues?: AllowedValues | (() => AllowedValues);
  blackbox?: boolean;
  custom?: () => void;
  exclusiveMax?: boolean;
  exclusiveMin?: boolean;
  maxCount?: number;
  max?: number | Date;
  minCount?: number;
  min?: number | Date;
  regEx?: RegExp;
  skipRegExCheckForEmptyStrings?: boolean;
  trim?: boolean;
}

export interface SchemaKeyTypeDefinition extends TypeDefinitionProps {
  type: SupportedTypes;
}

export type SchemaKeyTypeDefinitionWithShorthand = SchemaKeyTypeDefinition | SupportedTypes | RegExpConstructor

export interface SchemaKeyDefinitionBase extends TypeDefinitionProps {
  autoValue?: AutoValueFunction;
  defaultValue?: any;
  label?: string | (() => string);
  optional?: boolean | (() => boolean);
  required?: boolean | (() => boolean);
}

export interface SchemaKeyDefinitionWithOneType extends SchemaKeyDefinitionBase {
  type: SupportedTypes;
}

export interface StandardSchemaKeyDefinition extends SchemaKeyDefinitionBase {
  type: SimpleSchemaGroup;
}

export interface StandardSchemaKeyDefinitionWithSimpleTypes extends SchemaKeyDefinitionBase {
  type: (SchemaKeyTypeDefinition & { type: SupportedTypes })[];
}

export type SchemaKeyDefinition = StandardSchemaKeyDefinition | SchemaKeyDefinitionWithOneType
export type SchemaKeyDefinitionWithShorthand = StandardSchemaKeyDefinition | SchemaKeyDefinitionWithOneType | SupportedTypes | RegExpConstructor

export type SchemaDefinition = Record<string, SchemaKeyDefinition>;
export type SchemaDefinitionWithShorthand = Record<string, SchemaKeyDefinitionWithShorthand>;
export type ResolvedSchemaDefinition = Record<string, StandardSchemaKeyDefinition>;

export type SupportedTypes =
  | ArrayConstructor
  | BooleanConstructor
  | DateConstructor
  | NumberConstructor
  | StringConstructor
  | ObjectConstructor
  | typeof SimpleSchema.Any
  | typeof SimpleSchema.Integer
  | SimpleSchema;

export interface ValidationError {
  name: string;
  type: string;
  value: any;
}

export interface ValidationErrorResult {
  name?: string;
  type: string;
  value?: any;
}

export interface ValidationOptions {
  extendedCustomContext?: Record<string | number | symbol, unknown>;
  ignore?: string[];
  keys?: string[];
  modifier?: boolean;
  mongoObject?: any;
  upsert?: boolean;
}

export interface FieldInfo {
  isSet: boolean;
  operator: string | null;
  value: any;
}

export interface CommonContext {
  field: (fieldName: string) => FieldInfo;
  isModifier: boolean;
  isSet: boolean;
  key: string;
  operator: string | null;
  parentField: () => FieldInfo;
  siblingField: (fieldName: string) => FieldInfo;
  value: any;
}

export interface AutoValueContext extends CommonContext, CustomAutoValueContext {
  closestSubschemaFieldName: string | null;
  isUpsert: boolean;
  unset: () => void;
}

export interface TypeValidatorContext {
  definition: SchemaKeyDefinition;
  operator: string | null;
  value: any;
  valueShouldBeChecked: boolean;
}

export interface ValidatorContext extends CommonContext, CustomValidatorContext {
  addValidationErrors: (errors: ValidationError[]) => void;
  definition: SchemaKeyDefinition;
  field: (fieldName: string) => FieldInfo;
  genericKey: string;
  isInArrayItemObject: boolean;
  isInSubObject: boolean;
  obj: any;
  validationContext: ValidationContext;
  valueShouldBeChecked: boolean;
}

export interface DocValidatorContext extends CustomValidatorContext {
  ignoreTypes?: string[];
  isModifier: boolean;
  isUpsert: boolean;
  keysToValidate?: string[];
  mongoObject?: MongoObject;
  obj: any;
  schema: SimpleSchema;
  validationContext: ValidationContext;
}

export type FunctionPropContext = Omit<ValidatorContext, 'addValidationErrors' | 'valueShouldBeChecked'>

export type DocValidatorFunction = (this: DocValidatorContext, obj: Record<string, any>) => void | boolean | string | ValidationErrorResult;
export type ValidatorFunction = (this: ValidatorContext) => void | boolean | string | ValidationErrorResult;
