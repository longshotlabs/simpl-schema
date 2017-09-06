'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _SimpleSchema = require('../SimpleSchema');

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function doStringChecks(def, keyValue) {
  // Is it a String?
  if (typeof keyValue !== 'string') {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'String' };
  }

  // Is the string too long?
  if (def.max !== null && def.max < keyValue.length) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.MAX_STRING, max: def.max };
  }

  // Is the string too short?
  if (def.min !== null && def.min > keyValue.length) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.MIN_STRING, min: def.min };
  }

  // Does the string match the regular expression?
  if (def.regEx instanceof RegExp && !def.regEx.test(keyValue)) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.FAILED_REGULAR_EXPRESSION, regExp: def.regEx.toString() };
  }

  // If regEx is an array of regular expressions, does the string match all of them?
  if (Array.isArray(def.regEx)) {
    var regExError = void 0;
    _underscore2.default.every(def.regEx, function (re) {
      if (!re.test(keyValue)) {
        regExError = { type: _SimpleSchema.SimpleSchema.ErrorTypes.FAILED_REGULAR_EXPRESSION, regExp: re.toString() };
        return false;
      }
      return true;
    });
    if (regExError) return regExError;
  }
}

exports.default = doStringChecks;