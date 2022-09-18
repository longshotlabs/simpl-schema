import { ValidationError } from './types.js'

type GetMessageFn = (errorInfo: ValidationError, label: string | null) => string

const defaultMessages: Record<string, GetMessageFn> = {
  badDate: (_, label) => `${String(label)} is not a valid date`,
  expectedType: ({ dataType }, label) => `${String(label)} must be of type ${String(dataType)}`,
  keyNotInSchema: ({ name }) => `${name} is not allowed by the schema`,
  maxCount: ({ maxCount }) => `You cannot specify more than ${String(maxCount)} values`,
  maxDate: ({ max }, label) => `${String(label)} cannot be after ${String(max)}`,
  maxNumber: ({ max }, label) => `${String(label)} cannot exceed ${String(max)}`,
  maxNumberExclusive: ({ max }, label) => `${String(label)} must be less than ${String(max)}`,
  maxString: ({ max }, label) => `${String(label)} cannot exceed ${String(max)} characters`,
  minCount: ({ minCount }) => `You must specify at least ${String(minCount)} values`,
  minDate: ({ min }, label) => `${String(label)} must be on or after ${String(min)}`,
  minNumber: ({ min }, label) => `${String(label)} must be at least ${String(min)}`,
  minNumberExclusive: ({ min }, label) => `${String(label)} must be greater than ${String(min)}`,
  minString: ({ min }, label) => `${String(label)} must be at least ${String(min)} characters`,
  noDecimal: (_, label) => `${String(label)} must be an integer`,
  notAllowed: ({ value }) => `${String(value)} is not an allowed value`,
  regEx: (_, label) => `${String(label)} failed regular expression validation`,
  required: (_, label) => `${String(label)} is required`
}

export function getDefaultErrorMessage (errorInfo: ValidationError, label: string | null): string {
  const msgFn = defaultMessages[errorInfo.type]
  return typeof msgFn === 'function' ? msgFn(errorInfo, label) : `${errorInfo.type} ${errorInfo.name}`
}
