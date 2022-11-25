import clone from 'clone'
import MongoObject from 'mongo-object'

import convertToProperType from './clean/convertToProperType.js'
import setAutoValues from './clean/setAutoValues.js'
import { SimpleSchema } from './SimpleSchema.js'
import { CleanOptions, NodeContext } from './types.js'
import { isEmptyObject, looksLikeModifier } from './utility/index.js'
import { isValueTypeValid } from './validation/typeValidator/index.js'

const operatorsToIgnoreValue = ['$unset', '$currentDate']

function log (message: string): void {
  if (SimpleSchema.debug === true) {
    console.debug(message)
  }
}

/**
 * Cleans a document or modifier object. By default, will filter, automatically
 * type convert where possible, and inject automatic/default values. Use the options
 * to skip one or more of these.
 *
 * @param ss A SimpleSchema instance
 * @param doc Document or modifier to clean. Referenced object will be modified in place.
 * @param options Clean options
 * @returns The modified doc.
 */
function clean (
  ss: SimpleSchema,
  doc: Record<string | number | symbol, unknown>,
  options: CleanOptions = {}
): Record<string | number | symbol, unknown> {
  // By default, doc will be filtered and auto-converted
  const cleanOptions = {
    isModifier: looksLikeModifier(doc),
    isUpsert: false,
    // @ts-expect-error okay to use internal within the pkg
    ...ss._cleanOptions,
    ...options
  }

  Object.getOwnPropertyNames(cleanOptions).forEach((opt) => {
    if (!SimpleSchema.supportedCleanOptions.has(opt)) {
      console.warn(`Unsupported "${opt}" option passed to SimpleSchema clean`)
    }
  })

  // Clone so we do not mutate
  const cleanDoc = cleanOptions.mutate === true ? doc : clone(doc)

  const mongoObject =
    cleanOptions.mongoObject ?? new MongoObject(cleanDoc, ss.blackboxKeys())

  // Clean loop
  if (
    cleanOptions.filter === true ||
    cleanOptions.autoConvert === true ||
    cleanOptions.removeEmptyStrings === true ||
    cleanOptions.trimStrings === true
  ) {
    const removedPositions: string[] = [] // For removing now-empty objects after

    mongoObject.forEachNode(
      function eachNode (this: NodeContext) {
        // The value of a $unset is irrelevant, so no point in cleaning it.
        // Also we do not care if fields not in the schema are unset.
        // Other operators also have values that we wouldn't want to clean.
        if (operatorsToIgnoreValue.includes(this.operator)) return

        const gKey = this.genericKey
        if (gKey == null) return

        let val = this.value
        if (val === undefined) return

        let p

        // Filter out props if necessary
        if (
          (cleanOptions.filter === true && !ss.allowsKey(gKey)) ||
          (cleanOptions.removeNullsFromArrays === true && this.isArrayItem && val === null)
        ) {
          // XXX Special handling for $each; maybe this could be made nicer
          if (this.position.slice(-7) === '[$each]') {
            mongoObject.removeValueForPosition(this.position.slice(0, -7))
            removedPositions.push(this.position.slice(0, -7))
          } else {
            this.remove()
            removedPositions.push(this.position)
          }
          log(`SimpleSchema.clean: filtered out value that would have affected key "${gKey}", which is not allowed by the schema`)
          return // no reason to do more
        }

        const outerDef = ss.schema(gKey)
        const defs = outerDef?.type.definitions
        const def = defs?.[0]

        // Auto-convert values if requested and if possible
        if (cleanOptions.autoConvert === true && defs !== undefined && def != null && !isValueTypeValid(defs, val, this.operator)) {
          const newVal = convertToProperType(val, def.type)
          if (newVal !== undefined && newVal !== val) {
            log(`SimpleSchema.clean: auto-converted value ${String(val)} from ${typeof val} to ${typeof newVal} for ${gKey}`)
            val = newVal
            this.updateValue(newVal)
          }
        }

        // Clean string values
        if (typeof val === 'string') {
          // Trim strings if
          // 1. The trimStrings option is `true` AND
          // 2. The field is not in the schema OR is in the schema with `trim` !== `false`
          if (
            cleanOptions.trimStrings === true &&
            def?.trim !== false
          ) {
            val = val.trim()
            this.updateValue(val)
          }

          // Remove empty strings if
          // 1. The removeEmptyStrings option is `true` AND
          // 2. The value is in a normal object or in the $set part of a modifier
          // 3. The value is an empty string.
          if (
            cleanOptions.removeEmptyStrings === true &&
            (this.operator == null || this.operator === '$set') &&
            val.length === 0
          ) {
            // For a document, we remove any fields that are being set to an empty string
            this.remove()
            // For a modifier, we $unset any fields that are being set to an empty string.
            // But only if we're not already within an entire object that is being set.
            if (this.operator === '$set') {
              const matches = this.position.match(/\[/g)
              if (matches !== null && matches.length < 2) {
                p = this.position.replace('$set', '$unset')
                mongoObject.setValueForPosition(p, '')
              }
            }
          }
        }
      },
      { endPointsOnly: false }
    )

    // Remove any objects that are now empty after filtering
    removedPositions.forEach((removedPosition) => {
      const lastBrace = removedPosition.lastIndexOf('[')
      if (lastBrace !== -1) {
        const removedPositionParent = removedPosition.slice(0, lastBrace)
        const value = mongoObject.getValueForPosition(removedPositionParent)
        if (isEmptyObject(value)) { mongoObject.removeValueForPosition(removedPositionParent) }
      }
    })

    mongoObject.removeArrayItems()
  }

  // Set automatic values
  if (cleanOptions.getAutoValues === true) {
    setAutoValues(
      ss.autoValueFunctions(),
      mongoObject,
      cleanOptions.isModifier || false,
      cleanOptions.isUpsert || false,
      cleanOptions.extendAutoValueContext
    )
  }

  // Ensure we don't have any operators set to an empty object
  // since MongoDB 2.6+ will throw errors.
  if (cleanOptions.isModifier) {
    Object.keys(cleanDoc ?? {}).forEach((op) => {
      const operatorValue = cleanDoc[op]
      if (
        typeof operatorValue === 'object' &&
        operatorValue !== null &&
        isEmptyObject(operatorValue as Record<string, unknown>)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete cleanDoc[op]
      }
    })
  }

  return cleanDoc
}

export default clean
