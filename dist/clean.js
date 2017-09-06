'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _mongoObject = require('mongo-object');

var _mongoObject2 = _interopRequireDefault(_mongoObject);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _utility = require('./utility.js');

var _SimpleSchema = require('./SimpleSchema');

var _convertToProperType = require('./clean/convertToProperType');

var _convertToProperType2 = _interopRequireDefault(_convertToProperType);

var _setAutoValues = require('./clean/setAutoValues');

var _setAutoValues2 = _interopRequireDefault(_setAutoValues);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {SimpleSchema} ss - A SimpleSchema instance
 * @param {Object} doc - Document or modifier to clean. Referenced object will be modified in place.
 * @param {Object} [options]
 * @param {Boolean} [options.mutate=false] - Mutate doc. Set this to true to improve performance if you don't mind mutating the object you're cleaning.
 * @param {Boolean} [options.filter=true] - Do filtering?
 * @param {Boolean} [options.autoConvert=true] - Do automatic type converting?
 * @param {Boolean} [options.removeEmptyStrings=true] - Remove keys in normal object or $set where the value is an empty string?
 * @param {Boolean} [options.removeNullsFromArrays=false] - Remove all null items from all arrays
 * @param {Boolean} [options.trimStrings=true] - Trim string values?
 * @param {Boolean} [options.getAutoValues=true] - Inject automatic and default values?
 * @param {Boolean} [options.isModifier=false] - Is doc a modifier object?
 * @param {Boolean} [options.mongoObject] - If you already have the mongoObject instance, pass it to improve performance
 * @param {Object} [options.extendAutoValueContext] - This object will be added to the `this` context of autoValue functions.
 * @returns {Object} The modified doc.
 *
 * Cleans a document or modifier object. By default, will filter, automatically
 * type convert where possible, and inject automatic/default values. Use the options
 * to skip one or more of these.
 */
function clean(ss, doc) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  // By default, doc will be filtered and autoconverted
  options = _extends({
    isModifier: (0, _utility.looksLikeModifier)(doc)
  }, ss._cleanOptions, options);

  // Clone so we do not mutate
  var cleanDoc = options.mutate ? doc : (0, _clone2.default)(doc);

  var mongoObject = options.mongoObject || new _mongoObject2.default(cleanDoc, ss.blackboxKeys());

  // Clean loop
  if (options.filter || options.autoConvert || options.removeEmptyStrings || options.trimStrings) {
    var removedPositions = []; // For removing now-empty objects after

    mongoObject.forEachNode(function eachNode() {
      // The value of a $unset is irrelevant, so no point in cleaning it.
      // Also we do not care if fields not in the schema are unset.
      if (this.operator === '$unset') return;

      var gKey = this.genericKey;
      if (!gKey) return;

      var val = this.value;
      if (val === undefined) return;

      var p = void 0;

      // Filter out props if necessary
      if (options.filter && !ss.allowsKey(gKey) || options.removeNullsFromArrays && this.isArrayItem) {
        // XXX Special handling for $each; maybe this could be made nicer
        if (this.position.slice(-7) === '[$each]') {
          mongoObject.removeValueForPosition(this.position.slice(0, -7));
          removedPositions.push(this.position.slice(0, -7));
        } else {
          this.remove();
          removedPositions.push(this.position);
        }
        if (_SimpleSchema.SimpleSchema.debug) {
          console.info('SimpleSchema.clean: filtered out value that would have affected key "' + gKey + '", which is not allowed by the schema');
        }
        return; // no reason to do more
      }

      var outerDef = ss.schema(gKey);
      var def = outerDef && outerDef.type.definitions[0];

      // Autoconvert values if requested and if possible
      if (options.autoConvert && def) {
        var newVal = (0, _convertToProperType2.default)(val, def.type);
        if (newVal !== undefined && newVal !== val) {
          _SimpleSchema.SimpleSchema.debug && console.info('SimpleSchema.clean: autoconverted value ' + val + ' from ' + (typeof val === 'undefined' ? 'undefined' : _typeof(val)) + ' to ' + (typeof newVal === 'undefined' ? 'undefined' : _typeof(newVal)) + ' for ' + gKey);
          val = newVal;
          this.updateValue(newVal);
        }
      }

      // Trim strings if
      // 1. The trimStrings option is `true` AND
      // 2. The field is not in the schema OR is in the schema with `trim` !== `false` AND
      // 3. The value is a string.
      if (options.trimStrings && (!def || def.trim !== false) && typeof val === 'string') {
        val = val.trim();
        this.updateValue(val);
      }

      // Remove empty strings if
      // 1. The removeEmptyStrings option is `true` AND
      // 2. The value is in a normal object or in the $set part of a modifier
      // 3. The value is an empty string.
      if (options.removeEmptyStrings && (!this.operator || this.operator === '$set') && typeof val === 'string' && !val.length) {
        // For a document, we remove any fields that are being set to an empty string
        this.remove();
        // For a modifier, we $unset any fields that are being set to an empty string.
        // But only if we're not already within an entire object that is being set.
        if (this.operator === '$set' && this.position.match(/\[.+?\]/g).length < 2) {
          p = this.position.replace('$set', '$unset');
          mongoObject.setValueForPosition(p, '');
        }
      }
    }, { endPointsOnly: false });

    // Remove any objects that are now empty after filtering
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = removedPositions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var removedPosition = _step.value;

        var lastBrace = removedPosition.lastIndexOf('[');
        if (lastBrace === -1) continue;
        var removedPositionParent = removedPosition.slice(0, lastBrace);
        var value = mongoObject.getValueForPosition(removedPositionParent);
        if (_underscore2.default.isEmpty(value)) mongoObject.removeValueForPosition(removedPositionParent);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    mongoObject.removeArrayItems();
  }

  // Set automatic values
  options.getAutoValues && (0, _setAutoValues2.default)(ss.autoValueFunctions(), mongoObject, options.isModifier, options.extendAutoValueContext);

  // Ensure we don't have any operators set to an empty object
  // since MongoDB 2.6+ will throw errors.
  if (options.isModifier) {
    Object.keys(cleanDoc || {}).forEach(function (op) {
      if (_underscore2.default.isEmpty(cleanDoc[op])) delete cleanDoc[op];
    });
  }

  return cleanDoc;
}

exports.default = clean;