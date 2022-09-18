import MongoObject from 'mongo-object'

import { getLastPartOfKey, getParentOfKey } from '../utility/index.js'

interface GetPositionsForAutoValueProps {
  fieldName: string
  isModifier?: boolean
  mongoObject: MongoObject
}

interface PositionInfo {
  key: string
  operator: string | null
  position: string
}

/**
 * A position is a place in the object where this field exists.
 * If no arrays are involved, then every field/key has at most 1 position.
 * If arrays are involved, then a field could have potentially unlimited positions.
 *
 * For example, the key 'a.b.$.c` would have these positions:
 *   `a[b][0][c]`
 *   `a[b][1][c]`
 *   `a[b][2][c]`
 *
 * For this object:
 * {
 *   a: {
 *     b: [
 *       { c: 1 },
 *       { c: 1 },
 *       { c: 1 },
 *     ],
 *   },
 * }
 *
 * To make matters more complicated, we want to include not only the existing positions
 * but also the positions that might exist due to their parent object existing or their
 * parent object being auto-created by a MongoDB modifier that implies it.
 */
export default function getPositionsForAutoValue ({
  fieldName,
  isModifier,
  mongoObject
}: GetPositionsForAutoValueProps): PositionInfo[] {
  // Positions for this field
  const positions = mongoObject.getPositionsInfoForGenericKey(fieldName)

  // If the field is an object and will be created by MongoDB,
  // we don't need (and can't have) a value for it
  if (
    isModifier === true &&
    mongoObject.getPositionsThatCreateGenericKey(fieldName).length > 0
  ) {
    return positions
  }

  // For simple top-level fields, just add an undefined would-be position
  // if there isn't a real position.
  if (!fieldName.includes('.') && positions.length === 0) {
    positions.push({
      key: fieldName,
      // @ts-expect-error incorrect type in mongo-object package
      value: undefined,
      operator: isModifier === true ? '$set' : null,
      position: isModifier === true ? `$set[${fieldName}]` : fieldName
    })
    return positions
  }

  const parentPath = getParentOfKey(fieldName)
  const lastPart = getLastPartOfKey(fieldName, parentPath)
  const lastPartWithBraces = lastPart.replace(/\./g, '][')
  const parentPositions = mongoObject.getPositionsInfoForGenericKey(parentPath)

  if (parentPositions.length > 0) {
    parentPositions.forEach((info) => {
      const childPosition = `${info.position}[${lastPartWithBraces}]`
      if (positions.find((i) => i.position === childPosition) == null) {
        positions.push({
          key: `${info.key}.${lastPart}`,
          // @ts-expect-error incorrect type in mongo-object package
          value: undefined,
          operator: info.operator,
          position: childPosition
        })
      }
    })
  } else if (parentPath.slice(-2) !== '.$') {
    // positions that will create parentPath
    mongoObject.getPositionsThatCreateGenericKey(parentPath).forEach((info) => {
      const { operator, position } = info
      let wouldBePosition: string
      if (operator != null) {
        const next = position.slice(
          position.indexOf('[') + 1,
          position.indexOf(']')
        )
        const nextPieces = next.split('.')

        const newPieces = []
        let newKey = ''
        while ((nextPieces.length > 0) && newKey !== parentPath) {
          newPieces.push(nextPieces.shift())
          newKey = newPieces.join('.')
        }
        newKey = `${newKey}.${fieldName.slice(newKey.length + 1)}`
        wouldBePosition = `$set[${newKey}]`
      } else {
        const lastPart2 = getLastPartOfKey(fieldName, parentPath)
        const lastPartWithBraces2 = lastPart2.replace(/\./g, '][')
        wouldBePosition = `${position.slice(
          0,
          position.lastIndexOf('[')
        )}[${lastPartWithBraces2}]`
      }
      if (positions.find((item) => item.position === wouldBePosition) == null) {
        const key = MongoObject._positionToKey(wouldBePosition)
        if (key != null) {
          positions.push({
            key,
            // @ts-expect-error incorrect type in mongo-object package
            value: undefined,
            operator: operator == null ? null : '$set',
            position: wouldBePosition
          })
        }
      }
    })
  }

  return positions
}
