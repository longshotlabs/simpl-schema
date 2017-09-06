'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _SimpleSchema = require('../SimpleSchema');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Check for missing required values. The general logic is this:
// * If the operator is $unset or $rename, it's invalid.
// * If the value is null, it's invalid.
// * If the value is undefined and one of the following are true, it's invalid:
//     * We're validating a key of a sub-object.
//     * We're validating a key of an object that is an array item.
//     * We're validating a document (as opposed to a modifier).
//     * We're validating a key under the $set operator in a modifier, and it's an upsert.
function requiredValidator() {
  var _this = this;

  if (this.definition.optional) return;

  // We can skip the required check for keys that are ancestors
  // of those in $set or $setOnInsert because they will be created
  // by MongoDB while setting.
  var setKeys = Object.keys(this.obj.$set || {}).concat(Object.keys(this.obj.$setOnInsert || {}));
  var willBeCreatedAutomatically = _underscore2.default.some(setKeys, function (sk) {
    return sk.slice(0, _this.key.length + 1) === _this.key + '.';
  });
  if (willBeCreatedAutomatically) return;

  if (this.value === null || this.operator === '$unset' || this.operator === '$rename' || this.value === undefined && (this.isInArrayItemObject || this.isInSubObject || !this.operator || this.operator === '$set')) {
    return _SimpleSchema.SimpleSchema.ErrorTypes.REQUIRED;
  }
}

exports.default = requiredValidator;