import { getParentOfKey } from '../utility';
import includes from 'lodash.includes';

function getFieldInfo(mongoObject, key) {
  const keyInfo = mongoObject.getInfoForKey(key) || {};
  return {
    isSet: (keyInfo.value !== undefined),
    value: keyInfo.value,
    operator: keyInfo.operator || null,
  };
}

export default class AutoValueRunner {
  constructor(options) {
    this.options = options;
    this.doneKeys = [];
  }

  runForPosition({
    key: affectedKey,
    operator,
    position,
    value,
  }) {
    const {
      closestSubschemaFieldName,
      extendedAutoValueContext,
      func,
      isModifier,
      mongoObject,
    } = this.options;

    // If already called for this key, skip it
    if (includes(this.doneKeys, affectedKey)) return;

    const fieldParentName = getParentOfKey(affectedKey, true);

    let doUnset = false;

    if (Array.isArray(getFieldInfo(mongoObject, fieldParentName.slice(0, -1)).value)) {
      if (isNaN(affectedKey.split('.').slice(-1).pop())) {
        // parent is an array, but the key to be set is not an integer (see issue #80)
        return;
      }
    }

    const autoValue = func.call({
      isSet: (value !== undefined),
      unset() {
        doUnset = true;
      },
      value,
      operator,
      field(fName) {
        return getFieldInfo(mongoObject, closestSubschemaFieldName + fName);
      },
      siblingField(fName) {
        return getFieldInfo(mongoObject, fieldParentName + fName);
      },
      parentField() {
        return getFieldInfo(mongoObject, fieldParentName.slice(0, -1));
      },
      ...(extendedAutoValueContext || {}),
    }, mongoObject.getObject());

    // Update tracking of which keys we've run autovalue for
    this.doneKeys.push(affectedKey);

    if (doUnset && position) mongoObject.removeValueForPosition(position);

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
      if (!op && position.slice(0, 1) !== '$') {
        op = '$set';
        newValue = autoValue;
      }

      if (op) {
        // Update/change value
        mongoObject.removeValueForPosition(position);
        mongoObject.setValueForPosition(`${op}[${affectedKey}]`, newValue);
        return;
      }
    }

    // Update/change value
    mongoObject.setValueForPosition(position, autoValue);
  }
}
