import MongoObject from 'mongo-object';
import doValidation from './doValidation.js';
import _ from 'underscore';

export default class ValidationContext {
  constructor(ss) {
    this._simpleSchema = ss;
    this._schema = ss.schema();
    this._schemaKeys = Object.keys(this._schema);
    this._validationErrors = [];

    // Set up validation dependencies
    this._deps = {};
    const { tracker } = ss._constructorOptions;
    if (tracker) {
      this._depsAny = new tracker.Dependency();
      for (let key of this._schemaKeys) {
        this._deps[key] = new tracker.Dependency();
      }
    }
  }

  _markKeyChanged(key) {
    let genericKey = MongoObject.makeKeyGeneric(key);
    if (this._deps.hasOwnProperty(genericKey)) this._deps[genericKey].depend();
  }

  _markKeysChanged(keys) {
    if (!keys || !Array.isArray(keys) || !keys.length) return;

    for (let key of keys) {
      this._markKeyChanged(key);
    }

    this._depsAny && this._depsAny.changed();
  }

  setValidationErrors(errors) {
    let previousValidationErrors = _.pluck(this._validationErrors, 'name');
    let newValidationErrors = _.pluck(errors, 'name');

    this._validationErrors = errors;

    // Mark all previous plus all new as changed
    let changedKeys = previousValidationErrors.concat(newValidationErrors);
    this._markKeysChanged(changedKeys);
  }

  addValidationErrors(errors) {
    let newValidationErrors = _.pluck(errors, 'name');

    for (let error of errors) {
      this._validationErrors.push(error);
    }

    // Mark all new as changed
    this._markKeysChanged(newValidationErrors);
  }

  // Reset the validationErrors array
  reset() {
    this.setValidationErrors([]);
  }

  getErrorForKey(key, genericKey = MongoObject.makeKeyGeneric(key)) {
    let errors = this._validationErrors;
    return _.findWhere(errors, {name: key}) || _.findWhere(errors, {name: genericKey});
  }

  _keyIsInvalid(key, genericKey) {
    return !!this.getErrorForKey(key, genericKey);
  }

  // Like the internal one, but with deps
  keyIsInvalid(key, genericKey = MongoObject.makeKeyGeneric(key)) {
    if (this._deps.hasOwnProperty(genericKey)) this._deps[genericKey].depend();

    return this._keyIsInvalid(key, genericKey);
  }

  keyErrorMessage(key, genericKey = MongoObject.makeKeyGeneric(key)) {
    if (this._deps.hasOwnProperty(genericKey)) this._deps[genericKey].depend();

    let errorObj = this.getErrorForKey(key, genericKey);
    if (!errorObj) return "";

    return this._simpleSchema.messageForError(errorObj);
  }

  /**
   * Validates the object against the simple schema and sets a reactive array of error objects
   */
  validate(obj, {
    modifier: modifier = false,
    upsert: upsert = false,
    extendedCustomContext: extendedCustomContext = {},
    ignore: ignore = [],
    keys: keys = null,
  } = {}) {
    const validationErrors = doValidation({
      obj,
      isModifier: modifier,
      isUpsert: upsert,
      keysToValidate: keys,
      schema: this._simpleSchema,
      extendedCustomContext,
      ignoreTypes: ignore,
    });

    if (keys) {
      // We have only revalidated the listed keys, so if there
      // are any other existing errors that are NOT in the keys list,
      // we should keep these errors.
      for (const error of this._validationErrors) {
        const wasValidated = _.any(keys, key => key === error.name || error.name.startsWith(`${key}.`));
        if (!wasValidated) validationErrors.push(error);
      }
    }

    this.setValidationErrors(validationErrors);

    // Return true if it was valid; otherwise, return false
    return !validationErrors.length;
  }

  isValid() {
    this._depsAny && this._depsAny.depend();
    return this._validationErrors.length === 0;
  }

  validationErrors() {
    this._depsAny && this._depsAny.depend();
    return this._validationErrors;
  }

  clean(...args) {
    return this._simpleSchema.clean(...args);
  }
}
