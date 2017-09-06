'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _SimpleSchema = require('../SimpleSchema');

function doArrayChecks(def, keyValue) {
  // Is it an array?
  if (!Array.isArray(keyValue)) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Array' };
  }

  // Are there fewer than the minimum number of items in the array?
  if (def.minCount !== null && keyValue.length < def.minCount) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.MIN_COUNT, minCount: def.minCount };
  }

  // Are there more than the maximum number of items in the array?
  if (def.maxCount !== null && keyValue.length > def.maxCount) {
    return { type: _SimpleSchema.SimpleSchema.ErrorTypes.MAX_COUNT, maxCount: def.maxCount };
  }
}

exports.default = doArrayChecks;