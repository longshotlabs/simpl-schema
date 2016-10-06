import MongoObject from 'mongo-object';
import doValidation from './doValidation.js';
import _ from 'underscore';

export default class ValidationContext {
  constructor(ss) {
    this._simpleSchema = ss;
    this._schema = ss.mergedSchema();
    this._schemaKeys = Object.keys(this._schema);
    this._validationErrors = [];

    // Set up validation dependencies
    this._deps = {};
    const { tracker } = ss._constructorOptions;
    if (tracker) {
      this._depsAny = new tracker.Dependency();
      for (const key of this._schemaKeys) {
        this._deps[key] = new tracker.Dependency();
      }
    }
  }

  _markKeyChanged(key) {
    const genericKey = MongoObject.makeKeyGeneric(key);
    if (this._deps.hasOwnProperty(genericKey)) this._deps[genericKey].depend();
  }

  _markKeysChanged(keys) {
    if (!keys || !Array.isArray(keys) || !keys.length) return;

    for (const key of keys) {
      this._markKeyChanged(key);
    }

    this._depsAny && this._depsAny.changed();
  }

  setValidationErrors(errors) {
    const previousValidationErrors = _.pluck(this._validationErrors, 'name');
    const newValidationErrors = _.pluck(errors, 'name');

    this._validationErrors = errors;

    // Mark all previous plus all new as changed
    const changedKeys = previousValidationErrors.concat(newValidationErrors);
    this._markKeysChanged(changedKeys);
  }

  addValidationErrors(errors) {
    const newValidationErrors = _.pluck(errors, 'name');

    for (const error of errors) {
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
    const errors = this._validationErrors;
    return _.findWhere(errors, { name: key }) || _.findWhere(errors, { name: genericKey });
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

    const errorObj = this.getErrorForKey(key, genericKey);
    if (!errorObj) return '';

    return this._simpleSchema.messageForError(errorObj);
  }

  /**
   * Validates the object against the simple schema and sets a reactive array of error objects
   */
  validate(obj, {
    extendedCustomContext: extendedCustomContext = {},
    ignore: ignoreTypes = [],
    keys: keysToValidate,
    modifier: isModifier = false,
    mongoObject,
    upsert: isUpsert = false,
  } = {}) {
    const validationErrors = doValidation({
      extendedCustomContext,
      ignoreTypes,
      isModifier,
      isUpsert,
      keysToValidate,
      mongoObject,
      obj,
      schema: this._simpleSchema,
    });

    if (keysToValidate) {
      // We have only revalidated the listed keys, so if there
      // are any other existing errors that are NOT in the keys list,
      // we should keep these errors.
      for (const error of this._validationErrors) {
        const wasValidated = _.any(keysToValidate, key => key === error.name || error.name.startsWith(`${key}.`));
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
