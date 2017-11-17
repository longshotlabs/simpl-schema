import MongoObject from 'mongo-object';
import { getLastPartOfKey, getParentOfKey } from '../utility';

// Extracts operator piece, if present, from position string
function extractOp(position) {
  const firstPositionPiece = position.slice(0, position.indexOf('['));
  return (firstPositionPiece.substring(0, 1) === '$') ? firstPositionPiece : null;
}

function objectsThatKeyWillCreate(key) {
  const objs = [];

  do {
    const lastDotPosition = key.lastIndexOf('.');
    key = lastDotPosition === -1 ? '' : key.slice(0, lastDotPosition);
    if (key.length && !key.endsWith('.$')) objs.push(key);
  } while (key.length);

  return objs;
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
 */
export default function getPositionsForAutoValue({ fieldName, isModifier, mongoObject }) {
  const positions = [];

  // Loop through every position
  for (const position of Object.getOwnPropertyNames(mongoObject._genericAffectedKeys)) {
    const genericAffectedKey = mongoObject._genericAffectedKeys[position];
    const affectedKey = mongoObject._affectedKeys[position];
    const hasOperator = position.startsWith('$');

    // For pull, push, addToSet, and pop, mongoObject appends .0/.$ to the keys
    // but really we want to think of them as being related to the array itself
    // rather than the items. XXX It's possible that the change should be made in
    // mongo-object package, too.
    const isArrayOperator = ['$pull', '$push', '$addToSet', '$pop'].some(op => position.startsWith(op));

      // || genericAffectedKey === `${fieldName}.$`
    if (genericAffectedKey === fieldName) {
      positions.push({
        key: affectedKey,
        value: mongoObject.getValueForPosition(position),
        operator: extractOp(position),
        position,
      });
    } else if (isArrayOperator && genericAffectedKey === `${fieldName}.$`) {
      positions.push({
        key: affectedKey.slice(-2),
        value: mongoObject.getValueForPosition(position),
        operator: extractOp(position),
        position,
      });
    }

    // If the existing position is a parent and value is set, run for would-be
    // child position
    const parentPath = getParentOfKey(fieldName);
    if (genericAffectedKey === parentPath || `${genericAffectedKey}.$` === parentPath) {
      const lastPart = getLastPartOfKey(fieldName, parentPath);
      const lastPartWithBraces = lastPart.replace(/\./g, '][');
      const childPosition = `${position}[${lastPartWithBraces}]`;
      positions.push({
        key: `${affectedKey}.${lastPart}`,
        value: mongoObject.getValueForPosition(childPosition),
        operator: extractOp(position),
        position: childPosition,
      });
    }

    // If this position will implicitly create the parent object
    const objects = objectsThatKeyWillCreate(genericAffectedKey);
    if (parentPath.slice(-2) !== '.$' && objects.indexOf(parentPath) > -1) {
      if (hasOperator) {
        const operator = position.slice(0, position.indexOf('['));
        const next = position.slice(position.indexOf('[') + 1, position.indexOf(']'));
        const nextPieces = next.split('.');

        const newPieces = [];
        let newKey;
        while (nextPieces.length && newKey !== parentPath) {
          newPieces.push(nextPieces.shift());
          newKey = newPieces.join('.');
        }
        newKey = `${newKey}.${fieldName.slice(newKey.length + 1)}`;

        const wouldBePosition = `${operator}[${newKey}]`;
        positions.push({
          key: MongoObject._positionToKey(wouldBePosition),
          value: mongoObject.getValueForPosition(wouldBePosition),
          operator,
          position: wouldBePosition,
        });
      } else {
        const lastPart = getLastPartOfKey(fieldName, parentPath);
        const lastPartWithBraces = lastPart.replace(/\./g, '][');
        const wouldBePosition = `${position.slice(0, position.lastIndexOf('['))}[${lastPartWithBraces}]`;
        positions.push({
          key: MongoObject._positionToKey(wouldBePosition),
          value: mongoObject.getValueForPosition(wouldBePosition),
          operator: null,
          position: wouldBePosition,
        });
      }
    }
  }

  if (fieldName.indexOf('.') === -1 && positions.length === 0) {
    positions.push({
      key: fieldName,
      value: undefined,
      operator: isModifier ? '$set' : null,
      position: isModifier ? `$set[${fieldName}]` : fieldName,
    });
  }

  return positions;
}
