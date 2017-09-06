'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _SimpleSchema = require('../SimpleSchema');

var _doDateChecks = require('./doDateChecks');

var _doDateChecks2 = _interopRequireDefault(_doDateChecks);

var _doNumberChecks = require('./doNumberChecks');

var _doNumberChecks2 = _interopRequireDefault(_doNumberChecks);

var _doStringChecks = require('./doStringChecks');

var _doStringChecks2 = _interopRequireDefault(_doStringChecks);

var _doArrayChecks = require('./doArrayChecks');

var _doArrayChecks2 = _interopRequireDefault(_doArrayChecks);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function typeValidator() {
  if (!this.valueShouldBeChecked) return;

  var def = this.definition;
  var expectedType = def.type;
  var keyValue = this.value;
  var op = this.operator;

  if (expectedType === String) return (0, _doStringChecks2.default)(def, keyValue);
  if (expectedType === Number) return (0, _doNumberChecks2.default)(def, keyValue, op, false);
  if (expectedType === _SimpleSchema.SimpleSchema.Integer) return (0, _doNumberChecks2.default)(def, keyValue, op, true);

  if (expectedType === Boolean) {
    // Is it a boolean?
    if (typeof keyValue === 'boolean') return;
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Boolean' };
  }

  if (expectedType === Object || expectedType instanceof _SimpleSchema.SimpleSchema) {
    // Is it an object?
    if (keyValue === Object(keyValue) && !(keyValue instanceof Date)) return;
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Object' };
  }

  if (expectedType === Array) return (0, _doArrayChecks2.default)(def, keyValue);

  if (expectedType instanceof Function) {
    // Generic constructor checks
    if (!(keyValue instanceof expectedType)) return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: expectedType.name };

    // Date checks
    if (expectedType === Date) return (0, _doDateChecks2.default)(def, keyValue);
  }
}

exports.default = typeValidator;