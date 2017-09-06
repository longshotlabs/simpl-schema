'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _mongoObject = require('mongo-object');

var _mongoObject2 = _interopRequireDefault(_mongoObject);

var _utility = require('../utility.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
  var doneKeys = [];

  function getFieldInfo(key) {
    var keyInfo = mongoObject.getInfoForKey(key) || {};
    return {
      isSet: keyInfo.value !== undefined,
      value: keyInfo.value,
      operator: keyInfo.operator || null
    };
  }

  function runAV(func, closestSubschemaFieldName) {
    var affectedKey = this.key;

    // If already called for this key, skip it
    if (_underscore2.default.contains(doneKeys, affectedKey)) return;

    var fieldParentName = (0, _utility.getParentOfKey)(affectedKey, true);

    var doUnset = false;

    if (_underscore2.default.isArray(getFieldInfo(fieldParentName.slice(0, -1)).value)) {
      if (isNaN(this.key.split('.').slice(-1).pop())) {
        // parent is an array, but the key to be set is not an integer (see issue #80)
        return;
      }
    }

    var autoValue = func.call(_extends({
      isSet: this.value !== undefined,
      unset: function unset() {
        doUnset = true;
      },

      value: this.value,
      operator: this.operator,
      field: function field(fName) {
        return getFieldInfo(closestSubschemaFieldName + fName);
      },
      siblingField: function siblingField(fName) {
        return getFieldInfo(fieldParentName + fName);
      }
    }, extendedAutoValueContext || {}), mongoObject.getObject());

    // Update tracking of which keys we've run autovalue for
    doneKeys.push(affectedKey);

    if (doUnset) mongoObject.removeValueForPosition(this.position);

    if (autoValue === undefined) return;

    // If the user's auto value is of the pseudo-modifier format, parse it
    // into operator and value.
    if (isModifier) {
      var op = void 0;
      var newValue = void 0;
      if (autoValue && (typeof autoValue === 'undefined' ? 'undefined' : _typeof(autoValue)) === 'object') {
        var avOperator = Object.keys(autoValue).find(function (avProp) {
          return avProp.substring(0, 1) === '$';
        });
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
        mongoObject.setValueForPosition(op + '[' + affectedKey + ']', newValue);
        return;
      }
    }

    // Update/change value
    mongoObject.setValueForPosition(this.position, autoValue);
  }

  _underscore2.default.each(autoValueFunctions, function (_ref) {
    var func = _ref.func,
        fieldName = _ref.fieldName,
        closestSubschemaFieldName = _ref.closestSubschemaFieldName;

    // autoValue should run for the exact key only, for each array item if under array
    // should run whenever
    // 1 it is set
    // 2 it will be set by an ancestor field being set
    // 3 it is not set and is not within an array
    // 4 it is not set and is within an array, run for each array item that is set
    // 5 if doing $set[a.$] or $set[a.$.b]

    var test = fieldName;
    var positions = [];
    var lastDot = void 0;
    var lastDollar = fieldName.lastIndexOf('$');
    var isOrIsWithinArray = lastDollar !== -1;

    // Starting from the whole dotted field name for which the autoValue function
    // is defined, work backwards until finding one that is set.
    while (test.length > 0) {
      var currentPositions = mongoObject.getPositionsInfoForGenericKey(test);
      if (fieldName !== test && currentPositions.length > 0) {
        (function () {
          var lastPart = '';
          if (fieldName.indexOf(test + '.') === 0) {
            lastPart = fieldName.replace(test + '.', '');
            if (lastPart.startsWith('$.')) lastPart = lastPart.slice(2);
          }
          currentPositions = _underscore2.default.map(currentPositions, function (position) {
            position.key = position.key + '.' + lastPart;
            position.position = position.position + '[' + lastPart.replace(/\./g, '][') + ']';
            position.value = mongoObject.getValueForPosition(position.position);
            return position;
          });
        })();
      }
      positions = positions.concat(currentPositions);

      // Do the parent
      lastDot = test.lastIndexOf('.');
      if (lastDot > -1) {
        test = test.slice(0, lastDot);
      } else {
        test = '';
      }
    }

    if (positions.length === 0) {
      if (!isOrIsWithinArray) {
        positions.push({
          key: fieldName,
          value: undefined,
          operator: isModifier ? '$set' : null,
          position: isModifier ? '$set[' + fieldName + ']' : _mongoObject2.default._keyToPosition(fieldName)
        });
      }
    }

    // Run the autoValue function once for each place in the object that
    // has a value or that potentially should.
    _underscore2.default.each(positions, function (position) {
      runAV.call(position, func, closestSubschemaFieldName);
    });
  });
}

exports.default = setAutoValues;