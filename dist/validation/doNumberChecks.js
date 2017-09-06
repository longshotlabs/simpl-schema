'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _SimpleSchema = require('../SimpleSchema');

// Polyfill to support IE11
Number.isInteger = Number.isInteger || function isInteger(value) {
  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
};

function doNumberChecks(def, keyValue, op, expectsInteger) {
  // Is it a valid number?
  if (typeof keyValue !== 'number' || isNaN(keyValue)) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: expectsInteger ? 'Integer' : 'Number' };
  }

  // Assuming we are not incrementing, is the value less than the maximum value?
  if (op !== '$inc' && def.max !== null && (!!def.exclusiveMax ? def.max <= keyValue : def.max < keyValue)) {
    return { type: !!def.exclusiveMax ? _SimpleSchema.SimpleSchema.ErrorTypes.MAX_NUMBER_EXCLUSIVE : _SimpleSchema.SimpleSchema.ErrorTypes.MAX_NUMBER, max: def.max };
  }

  // Assuming we are not incrementing, is the value more than the minimum value?
  if (op !== '$inc' && def.min !== null && (!!def.exclusiveMin ? def.min >= keyValue : def.min > keyValue)) {
    return { type: !!def.exclusiveMin ? _SimpleSchema.SimpleSchema.ErrorTypes.MIN_NUMBER_EXCLUSIVE : _SimpleSchema.SimpleSchema.ErrorTypes.MIN_NUMBER, min: def.min };
  }

  // Is it an integer if we expect an integer?
  if (expectsInteger && !Number.isInteger(keyValue)) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.MUST_BE_INTEGER };
  }
}

exports.default = doNumberChecks;