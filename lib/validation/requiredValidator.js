import _ from 'underscore';
import { SimpleSchema } from '../SimpleSchema';

// Check for missing required values. The general logic is this:
// * If the operator is $unset or $rename, it's invalid.
// * If the value is null, it's invalid.
// * If the value is undefined and one of the following are true, it's invalid:
//     * We're validating a key of a sub-object.
//     * We're validating a key of an object that is an array item.
//     * We're validating a document (as opposed to a modifier).
//     * We're validating a key under the $set operator in a modifier, and it's an upsert.
function requiredValidator() {
  if (this.definition.optional) return;

  // We can skip the required check for keys that are ancestors
  // of those in $set or $setOnInsert because they will be created
  // by MongoDB while setting.
  const setKeys = Object.keys(this.obj.$set || {}).concat(Object.keys(this.obj.$setOnInsert || {}));
  const willBeCreatedAutomatically = _.some(setKeys, sk => (sk.slice(0, this.key.length + 1) === `${this.key}.`));
  if (willBeCreatedAutomatically) return;

  if (
    this.value === null ||
    this.operator === '$unset' ||
    this.operator === '$rename' ||
    (
      this.value === undefined &&
      (
        this.isInArrayItemObject ||
        this.isInSubObject ||
        !this.operator ||
        this.operator === '$set'
      )
    )
  ) {
    return SimpleSchema.ErrorTypes.REQUIRED;
  }
}

export default requiredValidator;
