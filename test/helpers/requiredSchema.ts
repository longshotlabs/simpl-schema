import { SimpleSchema } from '../../src/SimpleSchema.js'

const requiredSchema = new SimpleSchema(
  {
    requiredString: {
      type: String
    },
    requiredBoolean: {
      type: Boolean
    },
    requiredNumber: {
      type: SimpleSchema.Integer
    },
    requiredDate: {
      type: Date
    },
    requiredEmail: {
      type: String,
      custom() {
        if (typeof this.value === 'string' && !this.value.includes('@')) return 'invalidEmail'
      }
    },
    requiredUrl: {
      type: String,
      custom() {
        if (!this.isSet) return
        try {
          void new URL(this.value)
        } catch {
          return 'invalidUrl'
        }
      }
    },
    requiredObject: {
      type: Object
    },
    'requiredObject.requiredNumber': {
      type: SimpleSchema.Integer
    },
    optionalObject: {
      type: Object,
      optional: true
    },
    'optionalObject.requiredString': {
      type: String
    },
    anOptionalOne: {
      type: String,
      optional: true,
      min: 20
    }
  },
  {
    getErrorMessage(errorInfo, label) {
      if (errorInfo.type === 'invalidEmail') return `${String(label)} is not a valid email address`
      if (errorInfo.type === 'invalidUrl') return `${String(label)} is not a valid URL`
    }
  }
)

export default requiredSchema
