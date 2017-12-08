import { SimpleSchema } from '../SimpleSchema';

function getMapIterator(obj, matchKey, keyAdjust) {
  return (key) => {
    const val = obj[key];
    if (val === undefined || val === null) return null;
    if (keyAdjust(key) === matchKey) return key;
  };
}

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

  // If value is null, no matter what, we add required
  if (this.value === null) return SimpleSchema.ErrorTypes.REQUIRED;

  // If operator would remove, we add required
  if (this.operator === '$unset' || this.operator === '$rename') return SimpleSchema.ErrorTypes.REQUIRED;

  // The rest of these apply only if the value is undefined
  if (this.value !== undefined) return;

  // At this point, if it's a normal, non-modifier object, then a missing value is an error
  if (!this.operator) return SimpleSchema.ErrorTypes.REQUIRED;

  // Everything beyond this point deals with modifier objects only

  // We can skip the required check for keys that are ancestors
  // of those in $set or $setOnInsert because they will be created
  // by MongoDB while setting.
  const obj = this.obj;
  const keysWithValueInSet = Object.keys(obj.$set || {})
    .map(getMapIterator(obj.$set, `${this.key}.`, k => k.slice(0, this.key.length + 1)))
    .filter(v => !!v);
  const keysWithValueInSetOnInsert = Object.keys(obj.$setOnInsert || {})
    .map(getMapIterator(obj.$setOnInsert, `${this.key}.`, k => k.slice(0, this.key.length + 1)))
    .filter(v => !!v);
  const willBeCreatedAutomatically = keysWithValueInSet.concat(keysWithValueInSetOnInsert).some(v => v);
  if (willBeCreatedAutomatically) return;

  // In the case of $set and $setOnInsert, the value may be undefined here
  // but it is set in another operator. So check that first.
  const fieldInfo = this.field(this.key);
  if (fieldInfo.isSet && fieldInfo.value !== null) return;

  // Required if in an array or sub object
  if (this.isInArrayItemObject || this.isInSubObject) return SimpleSchema.ErrorTypes.REQUIRED;

  // If we've got this far with an undefined $set or $setOnInsert value,
  // it's a required error.
  if (this.operator === '$set' || this.operator === '$setOnInsert') return SimpleSchema.ErrorTypes.REQUIRED;
}

export default requiredValidator;
