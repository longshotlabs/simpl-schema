import MongoObject from 'mongo-object';
import _ from 'underscore';
import { SimpleSchema } from './SimpleSchema';
import { appendAffectedKey, looksLikeModifier, isObjectWeShouldTraverse } from './utility.js';
import doTypeChecks from './validation/doTypeChecks';

function shouldCheck(key) {
  if (key === '$pushAll') throw new Error('$pushAll is not supported; use $push + $each');
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1;
}

function doValidation({
  obj,
  isModifier,
  isUpsert,
  keysToValidate,
  schema,
  extendedCustomContext,
  ignoreTypes,
}) {
  // First do some basic checks of the object, and throw errors if necessary
  if (!_.isObject(obj)) {
    throw new Error('The first argument of validate() must be an object');
  }

  if (!isModifier && looksLikeModifier(obj)) {
    throw new Error('When the validation object contains mongo operators, you must set the modifier option to true');
  }

  let validationErrors = [];
  let mDoc; // for caching the MongoObject if necessary

  // Validation function called for each affected key
  function validate(val, affectedKey, affectedKeyGeneric, def, op, skipRequiredCheck, isInArrayItemObject, isInSubObject) {
    // Get the schema for this key, marking invalid if there isn't one.
    if (!def) {
      validationErrors.push({
        name: affectedKey,
        type: SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
        value: val,
      });
      return;
    }

    // Check for missing required values. The general logic is this:
    // * If the operator is $unset or $rename, it's invalid.
    // * If the value is null, it's invalid.
    // * If the value is undefined and one of the following are true, it's invalid:
    //     * We're validating a key of a sub-object.
    //     * We're validating a key of an object that is an array item.
    //     * We're validating a document (as opposed to a modifier).
    //     * We're validating a key under the $set operator in a modifier, and it's an upsert.
    if (!skipRequiredCheck && !def.optional) {
      if (
        val === null ||
        op === '$unset' ||
        op === '$rename' ||
        (val === void 0 && (isInArrayItemObject || isInSubObject || !op || op === '$set'))
        ) {
        validationErrors.push({
          name: affectedKey,
          type: SimpleSchema.ErrorTypes.REQUIRED,
          value: null,
        });
        return;
      }
    }

    // For $rename, make sure that the new name is allowed by the schema
    if (op === '$rename' && !schema.allowsKey(val)) {
      validationErrors.push({
        name: val,
        type: SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
        value: null,
      });
      return;
    }

    // Value checks are not necessary for null or undefined values, except for null array items,
    // or for $unset or $rename values
    let possiblyValidDefinitionsAfterStage2 = [];
    if (
      op !== '$unset' && op !== '$rename' &&
      ((val !== undefined && val !== null) || (affectedKeyGeneric.slice(-2) === '.$' && val === null))
    ) {
      const possiblyValidDefinitionsAfterStage1 = [];

      // Check that value is of the correct type
      let typeError;
      def.type.forEach(typeDef => {
        typeError = doTypeChecks(typeDef, val, op);
        if (!typeError) {
          possiblyValidDefinitionsAfterStage1.push(typeDef);
        }
      });
      if (possiblyValidDefinitionsAfterStage1.length === 0) {
        validationErrors.push({
          name: affectedKey,
          value: val,
          ...typeError,
        });
        return;
      }

      // Check value against allowedValues array
      possiblyValidDefinitionsAfterStage1.forEach(typeDef => {
        if (!typeDef.allowedValues || Array.includes(typeDef.allowedValues, val)) possiblyValidDefinitionsAfterStage2.push(typeDef);
      });
      if (possiblyValidDefinitionsAfterStage2.length === 0) {
        validationErrors.push({
          name: affectedKey,
          type: SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED,
          value: val,
        });
        return;
      }
    } else {
      possiblyValidDefinitionsAfterStage2 = def.type;
    }

    // Run custom validator functions
    const lastDot = affectedKey.lastIndexOf('.');
    const fieldParentName = lastDot === -1 ? '' : affectedKey.slice(0, lastDot + 1);
    const functionContext = {
      key: affectedKey,
      genericKey: affectedKeyGeneric,
      definition: def,
      isSet: (val !== undefined),
      value: val,
      operator: op,
      field: (fName) => {
        mDoc = mDoc || new MongoObject(obj, schema._blackboxKeys); // create if necessary, cache for speed
        const keyInfo = mDoc.getInfoForKey(fName) || {};
        return {
          isSet: (keyInfo.value !== undefined),
          value: keyInfo.value,
          operator: keyInfo.operator,
        };
      },
      siblingField: (fName) => {
        mDoc = mDoc || new MongoObject(obj, schema._blackboxKeys); // create if necessary, cache for speed
        const keyInfo = mDoc.getInfoForKey(fieldParentName + fName) || {};
        return {
          isSet: (keyInfo.value !== undefined),
          value: keyInfo.value,
          operator: keyInfo.operator,
        };
      },
      addValidationErrors: (errors) => {
        for (const error of errors) {
          validationErrors.push(error);
        }
      },
      ...(extendedCustomContext || {}),
    };

    function runValidator(validator) {
      const result = validator.call(functionContext);
      if (typeof result === 'string') {
        validationErrors.push({
          name: affectedKey,
          type: result,
          value: val,
        });
        return false;
      }
      if (result === false) return false;
      return true;
    }

    // Add instance validators and global validators
    const validators = schema._validators.concat(SimpleSchema._validators);

    // Add all `custom` functions in the oneOf types. Add them to the beginning
    // of the array so that they run before instance and global validators.
    possiblyValidDefinitionsAfterStage2.forEach(typeDef => {
      if (typeof typeDef.custom === 'function') validators.unshift(typeDef.custom);
    });

    // We use _.every just so that we don't continue running more validator
    // functions after the first one returns false or an error string.
    _.every(validators, runValidator);
  }

  // The recursive function
  function checkObj({
    val,
    affectedKey,
    operator,
    setKeys,
    isInArrayItemObject = false,
    isInSubObject = false,
  }) {
    let affectedKeyGeneric;
    let def;

    if (affectedKey) {
      // When we hit a blackbox key, we don't progress any further
      if (schema.keyIsInBlackBox(affectedKey)) return;

      // Make a generic version of the affected key, and use that
      // to get the schema for this key.
      affectedKeyGeneric = MongoObject.makeKeyGeneric(affectedKey);
      def = schema.getDefinition(affectedKey);

      const shouldValidateKey = !keysToValidate || _.any(keysToValidate, keyToValidate => (
        keyToValidate === affectedKey ||
        keyToValidate === affectedKeyGeneric ||
        affectedKey.indexOf(`${keyToValidate}.`) === 0 ||
        affectedKeyGeneric.indexOf(`${keyToValidate}.`) === 0
      ));

      // Perform validation for this key
      if (shouldValidateKey) {
        // We can skip the required check for keys that are ancestors
        // of those in $set or $setOnInsert because they will be created
        // by MongoDB while setting.
        const skipRequiredCheck = _.some(setKeys, sk => (sk.slice(0, affectedKey.length + 1) === `${affectedKey}.`));
        validate(val, affectedKey, affectedKeyGeneric, def, operator, skipRequiredCheck, isInArrayItemObject, isInSubObject);
      }
    }

    // If affectedKeyGeneric is undefined due to this being the first run of this
    // function, objectKeys will return the top-level keys.
    const childKeys = schema.objectKeys(affectedKeyGeneric);

    // Temporarily convert missing objects to empty objects
    // so that the looping code will be called and required
    // descendent keys can be validated.
    if ((val === undefined || val === null) && (!def || (!def.optional && childKeys && childKeys.length > 0))) {
      val = {};
    }

    // Loop through arrays
    if (Array.isArray(val)) {
      _.each(val, (v, i) => {
        checkObj({
          val: v,
          affectedKey: `${affectedKey}.${i}`,
          operator,
          setKeys,
        });
      });
    } else if (isObjectWeShouldTraverse(val) && (!def || !def.blackbox)) {
      // Loop through object keys

      // Get list of present keys
      const presentKeys = Object.keys(val);

      // Check all present keys plus all keys defined by the schema.
      // This allows us to detect extra keys not allowed by the schema plus
      // any missing required keys, and to run any custom functions for other keys.
      const keysToCheck = _.union(presentKeys, childKeys);

      // If this object is within an array, make sure we check for
      // required as if it's not a modifier
      isInArrayItemObject = (affectedKeyGeneric && affectedKeyGeneric.slice(-2) === '.$');

      // Check all keys in the merged list
      _.each(keysToCheck, key => {
        checkObj({
          val: val[key],
          affectedKey: appendAffectedKey(affectedKey, key),
          operator,
          setKeys,
          isInArrayItemObject,
          isInSubObject: true,
        });
      });
    }
  }

  function checkModifier(mod) {
    // Get a list of all keys in $set and $setOnInsert combined, for use later
    const setKeys = Object.keys(mod.$set || {}).concat(Object.keys(mod.$setOnInsert || {}));

    // If this is an upsert, add all the $setOnInsert keys to $set;
    // since we don't know whether it will be an insert or update, we'll
    // validate upserts as if they will be an insert.
    if ('$setOnInsert' in mod) {
      if (isUpsert) {
        mod.$set = mod.$set || {};
        mod.$set = Object.assign(mod.$set, mod.$setOnInsert);
      }
      delete mod.$setOnInsert;
    }

    // Loop through operators
    _.each(mod, (opObj, op) => {
      // If non-operators are mixed in, throw error
      if (op.slice(0, 1) !== '$') {
        throw new Error(`Expected '${op}' to be a modifier operator like '$set'`);
      }
      if (shouldCheck(op)) {
        // For an upsert, missing props would not be set if an insert is performed,
        // so we check them all with undefined value to force any 'required' checks to fail
        if (isUpsert && op === '$set') {
          const presentKeys = Object.keys(opObj);
          _.each(schema.objectKeys(), (schemaKey) => {
            if (!Array.includes(presentKeys, schemaKey)) {
              checkObj({
                val: undefined,
                affectedKey: schemaKey,
                operator: op,
                setKeys,
              });
            }
          });
        }
        _.each(opObj, (v, k) => {
          if (op === '$push' || op === '$addToSet') {
            if (typeof v === 'object' && '$each' in v) {
              v = v.$each;
            } else {
              k = `${k}.0`;
            }
          }
          checkObj({
            val: v,
            affectedKey: k,
            operator: op,
            setKeys,
          });
        });
      }
    });
  }

  // Kick off the validation
  if (isModifier) {
    checkModifier(obj);
  } else {
    checkObj({ val: obj });
  }

  // Custom whole-doc validators
  const docValidators = schema._docValidators.concat(SimpleSchema._docValidators);
  docValidators.forEach(func => {
    const errors = func(obj);
    if (!Array.isArray(errors)) throw new Error('Custom doc validator must return an array of error objects');
    if (errors.length) validationErrors = validationErrors.concat(errors);
  });

  const addedFieldNames = [];
  validationErrors = _.filter(validationErrors, errObj => {
    // Remove error types the user doesn't care about
    if (Array.includes(ignoreTypes, errObj.type)) return false;
    // Make sure there is only one error per fieldName
    if (Array.includes(addedFieldNames, errObj.name)) return false;

    addedFieldNames.push(errObj.name);
    return true;
  });
  return validationErrors;
}

export default doValidation;
