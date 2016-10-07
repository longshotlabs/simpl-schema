import _ from 'underscore';
import MongoObject from 'mongo-object';
import { getParentOfKey } from '../utility.js';

/**
 * @method setAutoValues
 * @private
 * @param {Array} autoValueFunctions - An array of objects with func, fieldName, and closestSubschemaFieldName props
 * @param {MongoObject} mongoObject
 * @param {Boolean} [isModifier=false] - Is it a modifier doc?
 * @param {Object} [extendedAutoValueContext] - Object that will be added to the context when calling each autoValue function
 * @returns {undefined}
 *
 * Updates doc with automatic values from autoValue functions or default
 * values from defaultValue. Modifies the referenced object in place.
 */
function setAutoValues(autoValueFunctions, mongoObject, isModifier, extendedAutoValueContext) {
  const doneKeys = [];

  function getFieldInfo(key) {
    const keyInfo = mongoObject.getInfoForKey(key) || {};
    return {
      isSet: (keyInfo.value !== undefined),
      value: keyInfo.value,
      operator: keyInfo.operator || null,
    };
  }

  function runAV(func, closestSubschemaFieldName) {
    const affectedKey = this.key;

    // If already called for this key, skip it
    if (Array.includes(doneKeys, affectedKey)) return;

    const fieldParentName = getParentOfKey(affectedKey, true);

    let doUnset = false;
    const autoValue = func.call({
      isSet: (this.value !== undefined),
      unset() {
        doUnset = true;
      },
      value: this.value,
      operator: this.operator,
      field(fName) {
        return getFieldInfo(closestSubschemaFieldName + fName);
      },
      siblingField(fName) {
        return getFieldInfo(fieldParentName + fName);
      },
      ...(extendedAutoValueContext || {}),
    }, mongoObject.getObject());

    // Update tracking of which keys we've run autovalue for
    doneKeys.push(affectedKey);

    if (doUnset) mongoObject.removeValueForPosition(this.position, !isModifier);

    if (autoValue === undefined) return;

    // If the user's auto value is of the pseudo-modifier format, parse it
    // into operator and value.
    if (isModifier) {
      let op;
      let newValue;
      if (autoValue && typeof autoValue === 'object') {
        const avOperator = Object.keys(autoValue).find(avProp => avProp.substring(0, 1) === '$');
        if (avOperator) {
          op = avOperator;
          newValue = autoValue[avOperator];
        }
      }

      // Add $set for updates and upserts if necessary. Keep this
      // above the "if (op)" block below since we might change op
      // in this line.
      if (!op && this.position.slice(0, 1) !== '$') {
        op = '$set';
        newValue = autoValue;
      }

      if (op) {
        // Update/change value
        mongoObject.removeValueForPosition(this.position);
        mongoObject.setValueForPosition(`${op}[${affectedKey}]`, newValue);
        return;
      }
    }

    // We want to traverse object paths (foo.bar) only if:
    // 1. The document is not a mongo modifier
    // or
    // 2. The current position is not nested directly under a modifier like $push
    //
    // If we are directly under the modifier we want to use a nested path setter
    // ex: $push: {
    //  'foo.bar.baz': 3
    // }
    //
    // but if we are actually setting a nested object we want to use an object setter
    // ex: $push: {
    //   foo: {
    //     bar: {
    //       baz: 3
    //     }
    //   }
    // }
    //
    // The reason is that setting $push: {
    //   foo: {
    //     'bar.baz': 3
    //   }
    // }
    //
    // is illegal because mongo cannot have "." in its keys
    const traverseObject = !isModifier || /\]\[/.test(this.position);

    // Update/change value
    mongoObject.setValueForPosition(this.position, autoValue, traverseObject);
  }

  _.each(autoValueFunctions, ({ func, fieldName, closestSubschemaFieldName }) => {
    // autoValue should run for the exact key only, for each array item if under array
    // should run whenever
    // 1 it is set
    // 2 it will be set by an ancestor field being set
    // 3 it is not set and is not within an array
    // 4 it is not set and is within an array, run for each array item that is set
    // 5 if doing $set[a.$] or $set[a.$.b]

    let test = fieldName;
    let positions = [];
    let lastDot;
    const lastDollar = fieldName.lastIndexOf('$');
    const isOrIsWithinArray = lastDollar !== -1;

    // We always need to start by checking the array itself in case
    // it has items that have objects that need autoValue run. If not, we
    // will later check for the exact field name.
    if (isOrIsWithinArray) test = fieldName.slice(0, lastDollar + 1);

    while (positions.length === 0 && test.length > 0) {
      positions = mongoObject.getPositionsInfoForGenericKey(test);
      if (positions.length > 0) {
        if (fieldName !== test) {
          if (fieldName.indexOf('.$.') > -1) {
            let lastPart = '';
            if (fieldName.indexOf(`${test}.`) === 0) {
              lastPart = fieldName.replace(`${test}.`, '');
            }
            positions = _.map(positions, position => {
              position.key = `${position.key}.${lastPart}`;
              position.position = `${position.position}[${lastPart}]`;
              position.value = mongoObject.getValueForPosition(position.position, !isModifier);
              return position;
            });
          } else {
            positions = [];
            break;
          }
        }
      } else {
        lastDot = test.lastIndexOf('.');
        if (lastDot > -1) {
          test = test.slice(0, lastDot);
        } else {
          test = '';
        }
      }
    }

    if (positions.length === 0) {
      if (isOrIsWithinArray) {
        positions = mongoObject.getPositionsInfoForGenericKey(fieldName);
      } else {
        // Not set directly or indirectly
        positions.push({
          key: fieldName,
          value: undefined,
          operator: isModifier ? '$set' : null,
          position: isModifier ? `$set[${fieldName}]` : MongoObject._keyToPosition(fieldName),
        });
      }
    }

    // Run the autoValue function once for each place in the object that
    // has a value or that potentially should.
    _.each(positions, position => {
      runAV.call(position, func, closestSubschemaFieldName);
    });
  });
}

export default setAutoValues;
