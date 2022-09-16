import clone from 'clone'
import MongoObject from 'mongo-object'

import { AutoValueContext, AutoValueFunction, FieldInfo } from '../types.js'
import { getParentOfKey } from '../utility/index.js'

interface AutoValueRunnerOptions {
  closestSubschemaFieldName: string
  extendedAutoValueContext?: Record<string | number | symbol, unknown>
  func: AutoValueFunction
  isModifier: boolean
  isUpsert: boolean
  mongoObject: MongoObject
}

interface RunForPositionProps {
  key: string
  operator: string
  position: string
  value: any
}

function getFieldInfo <ValueType> (mongoObject: MongoObject, key: string): FieldInfo<ValueType> {
  const keyInfo = mongoObject.getInfoForKey(key) ?? {
    operator: null,
    value: undefined
  }
  return {
    ...keyInfo,
    isSet: keyInfo.value !== undefined
  }
}

export default class AutoValueRunner {
  doneKeys: string[] = []
  options: AutoValueRunnerOptions

  constructor (options: AutoValueRunnerOptions) {
    this.options = options
  }

  runForPosition ({
    key: affectedKey,
    operator,
    position,
    value
  }: RunForPositionProps): void {
    const {
      closestSubschemaFieldName,
      extendedAutoValueContext,
      func,
      isModifier,
      isUpsert,
      mongoObject
    } = this.options

    // If already called for this key, skip it
    if (this.doneKeys.includes(affectedKey)) return

    const fieldParentName = getParentOfKey(affectedKey, true)
    const parentFieldInfo = getFieldInfo<any>(
      mongoObject,
      fieldParentName.slice(0, -1)
    )

    let doUnset = false

    if (Array.isArray(parentFieldInfo.value)) {
      const innerKey = affectedKey.split('.').slice(-1).pop()
      if (innerKey === undefined || isNaN(Number(innerKey))) {
        // parent is an array, but the key to be set is not an integer (see issue #80)
        return
      }
    }

    const autoValueContext: AutoValueContext = {
      closestSubschemaFieldName: closestSubschemaFieldName.length > 0
        ? closestSubschemaFieldName
        : null,
      field (fName: string) {
        return getFieldInfo(mongoObject, closestSubschemaFieldName + fName)
      },
      isModifier,
      isUpsert,
      isSet: value !== undefined,
      key: affectedKey,
      operator,
      parentField () {
        return parentFieldInfo
      },
      siblingField (fName: string) {
        return getFieldInfo(mongoObject, fieldParentName + fName)
      },
      unset () {
        doUnset = true
      },
      value,
      ...(extendedAutoValueContext ?? {})
    }

    const autoValue = func.call(autoValueContext, mongoObject.getObject())

    // Update tracking of which keys we've run autovalue for
    this.doneKeys.push(affectedKey)

    if (doUnset && position != null) mongoObject.removeValueForPosition(position)

    if (autoValue === undefined) return

    // If the user's auto value is of the pseudo-modifier format, parse it
    // into operator and value.
    if (isModifier) {
      let op
      let newValue
      if (autoValue != null && typeof autoValue === 'object') {
        const avOperator = Object.keys(autoValue).find(
          (avProp) => avProp.substring(0, 1) === '$'
        )
        if (avOperator !== undefined) {
          op = avOperator
          newValue = autoValue[avOperator]
        }
      }

      // Add $set for updates and upserts if necessary. Keep this
      // above the "if (op)" block below since we might change op
      // in this line.
      if (op == null && position.slice(0, 1) !== '$') {
        op = '$set'
        newValue = autoValue
      }

      if (op != null) {
        // Update/change value
        mongoObject.removeValueForPosition(position)
        mongoObject.setValueForPosition(
          `${op}[${affectedKey}]`,
          clone(newValue)
        )
        return
      }
    }

    // Update/change value. Cloning is necessary in case it's an object, because
    // if we later set some keys within it, they'd be set on the original object, too.
    mongoObject.setValueForPosition(position, clone(autoValue))
  }
}
