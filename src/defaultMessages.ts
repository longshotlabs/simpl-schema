import regExpObj from './regExp.js'
import { ValidationError } from './types.js'

const regExpMessages = [
  { exp: regExpObj.Email, msg: 'must be a valid email address' },
  { exp: regExpObj.EmailWithTLD, msg: 'must be a valid email address' },
  { exp: regExpObj.Domain, msg: 'must be a valid domain' },
  { exp: regExpObj.WeakDomain, msg: 'must be a valid domain' },
  { exp: regExpObj.IP, msg: 'must be a valid IPv4 or IPv6 address' },
  { exp: regExpObj.IPv4, msg: 'must be a valid IPv4 address' },
  { exp: regExpObj.IPv6, msg: 'must be a valid IPv6 address' },
  { exp: regExpObj.Url, msg: 'must be a valid URL' },
  { exp: regExpObj.Id, msg: 'must be a valid alphanumeric ID' },
  { exp: regExpObj.ZipCode, msg: 'must be a valid ZIP code' },
  { exp: regExpObj.Phone, msg: 'must be a valid phone number' }
]

type GetMessageFn = (errorInfo: ValidationError, label: string | null) => string

const defaultMessages: Record<string, GetMessageFn> = {
  required: (_, label) => `${String(label)} is required`,
  minString: ({ min }, label) => `${String(label)} must be at least ${String(min)} characters`,
  maxString: ({ max }, label) => `${String(label)} cannot exceed ${String(max)} characters`,
  minNumber: ({ min }, label) => `${String(label)} must be at least ${String(min)}`,
  maxNumber: ({ max }, label) => `${String(label)} cannot exceed ${String(max)}`,
  minNumberExclusive: ({ min }, label) => `${String(label)} must be greater than ${String(min)}`,
  maxNumberExclusive: ({ max }, label) => `${String(label)} must be less than ${String(max)}`,
  minDate: ({ min }, label) => `${String(label)} must be on or after ${String(min)}`,
  maxDate: ({ max }, label) => `${String(label)} cannot be after ${String(max)}`,
  badDate: (_, label) => `${String(label)} is not a valid date`,
  minCount: ({ minCount }, label) => `You must specify at least ${String(minCount)} values`,
  maxCount: ({ maxCount }, label) => `You cannot specify more than ${String(maxCount)} values`,
  noDecimal: (_, label) => `${String(label)} must be an integer`,
  notAllowed: ({ value }, label) => `${String(value)} is not an allowed value`,
  expectedType: ({ dataType }, label) => `${String(label)} must be of type ${String(dataType)}`,
  regEx ({ regExp }, label) {
    // See if there's one where exp matches this expression
    let msgObj
    if (regExp != null) {
      msgObj = regExpMessages.find(
        (o) => o.exp != null && o.exp.toString() === regExp
      )
    }

    const regExpMessage = (msgObj != null)
      ? msgObj.msg
      : 'failed regular expression validation'

    return `${label as string} ${regExpMessage}`
  },
  keyNotInSchema: ({ name }) => `${name} is not allowed by the schema`
}

export function getDefaultErrorMessage (errorInfo: ValidationError, label: string | null): string {
  const msgFn = defaultMessages[errorInfo.type]
  return typeof msgFn === 'function' ? msgFn(errorInfo, label) : `${errorInfo.type} ${errorInfo.name}`
}
