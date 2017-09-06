'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _SimpleSchema = require('../SimpleSchema');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function allowedValuesValidator() {
  if (!this.valueShouldBeChecked) return;

  var allowedValues = this.definition.allowedValues;
  if (!allowedValues) return;

  var isAllowed = _underscore2.default.contains(allowedValues, this.value);
  return isAllowed ? true : _SimpleSchema.SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}

exports.default = allowedValuesValidator;