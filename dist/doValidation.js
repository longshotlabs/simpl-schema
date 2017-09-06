'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _mongoObject = require('mongo-object');

var _mongoObject2 = _interopRequireDefault(_mongoObject);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _SimpleSchema = require('./SimpleSchema');

var _utility = require('./utility.js');

var _typeValidator = require('./validation/typeValidator');

var _typeValidator2 = _interopRequireDefault(_typeValidator);

var _requiredValidator = require('./validation/requiredValidator');

var _requiredValidator2 = _interopRequireDefault(_requiredValidator);

var _allowedValuesValidator = require('./validation/allowedValuesValidator');

var _allowedValuesValidator2 = _interopRequireDefault(_allowedValuesValidator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function shouldCheck(key) {
  if (key === '$pushAll') throw new Error('$pushAll is not supported; use $push + $each');
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1;
}

function doValidation(_ref) {
  var extendedCustomContext = _ref.extendedCustomContext,
      ignoreTypes = _ref.ignoreTypes,
      isModifier = _ref.isModifier,
      isUpsert = _ref.isUpsert,
      keysToValidate = _ref.keysToValidate,
      mongoObject = _ref.mongoObject,
      obj = _ref.obj,
      schema = _ref.schema,
      validationContext = _ref.validationContext;

  // First do some basic checks of the object, and throw errors if necessary
  if (!_underscore2.default.isObject(obj)) {
    throw new Error('The first argument of validate() must be an object');
  }

  if (!isModifier && (0, _utility.looksLikeModifier)(obj)) {
    throw new Error('When the validation object contains mongo operators, you must set the modifier option to true');
  }

  var validationErrors = [];

  // Validation function called for each affected key
  function validate(val, affectedKey, affectedKeyGeneric, def, op, isInArrayItemObject, isInSubObject) {
    // Get the schema for this key, marking invalid if there isn't one.
    if (!def) {
      // We don't need KEY_NOT_IN_SCHEMA error for $unset and we also don't need to continue
      if (op === '$unset') return;

      validationErrors.push({
        name: affectedKey,
        type: _SimpleSchema.SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
        value: val
      });
      return;
    }

    // For $rename, make sure that the new name is allowed by the schema
    if (op === '$rename' && !schema.allowsKey(val)) {
      validationErrors.push({
        name: val,
        type: _SimpleSchema.SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA,
        value: null
      });
      return;
    }

    // Prepare the context object for the validator functions
    var fieldParentName = (0, _utility.getParentOfKey)(affectedKey, true);

    function getFieldInfo(key) {
      // Create mongoObject if necessary, cache for speed
      if (!mongoObject) mongoObject = new _mongoObject2.default(obj, schema.blackboxKeys());

      var keyInfo = mongoObject.getInfoForKey(key) || {};
      return {
        isSet: keyInfo.value !== undefined,
        value: keyInfo.value,
        operator: keyInfo.operator || null
      };
    }

    var fieldValidationErrors = [];

    var validatorContext = _extends({
      addValidationErrors: function addValidationErrors(errors) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var error = _step.value;

            fieldValidationErrors.push(error);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      },
      field: function field(fName) {
        return getFieldInfo(fName);
      },

      genericKey: affectedKeyGeneric,
      isInArrayItemObject: isInArrayItemObject,
      isInSubObject: isInSubObject,
      isModifier: isModifier,
      isSet: val !== undefined,
      key: affectedKey,
      obj: obj,
      operator: op,
      siblingField: function siblingField(fName) {
        return getFieldInfo(fieldParentName + fName);
      },

      validationContext: validationContext,
      value: val,
      // Value checks are not necessary for null or undefined values,
      // except for null array items, or for $unset or $rename values
      valueShouldBeChecked: op !== '$unset' && op !== '$rename' && (val !== undefined && val !== null || affectedKeyGeneric.slice(-2) === '.$' && val === null)
    }, extendedCustomContext || {});

    var builtInValidators = [_requiredValidator2.default, _typeValidator2.default, _allowedValuesValidator2.default];
    var validators = builtInValidators.concat(schema._validators).concat(_SimpleSchema.SimpleSchema._validators);

    // Loop through each of the definitions in the SimpleSchemaGroup.
    // If any return true, we're valid.
    var fieldIsValid = _underscore2.default.some(def.type, function (typeDef) {
      var finalValidatorContext = _extends({}, validatorContext, {

        // Take outer definition props like "optional" and "label"
        // and add them to inner props like "type" and "min"
        definition: _extends({}, _underscore2.default.omit(def, 'type'), typeDef)
      });

      // Add custom field validators to the list after the built-in
      // validators but before the schema and global validators.
      var fieldValidators = validators.slice(0);
      if (typeof typeDef.custom === 'function') {
        fieldValidators.splice(builtInValidators.length, 0, typeDef.custom);
      }

      // We use _.every just so that we don't continue running more validator
      // functions after the first one returns false or an error string.
      return _underscore2.default.every(fieldValidators, function (validator) {
        var result = validator.call(finalValidatorContext);

        // If the validator returns a string, assume it is the
        // error type.
        if (typeof result === 'string') {
          fieldValidationErrors.push({
            name: affectedKey,
            type: result,
            value: val
          });
          return false;
        }

        // If the validator returns an object, assume it is an
        // error object.
        if ((typeof result === 'undefined' ? 'undefined' : _typeof(result)) === 'object' && result !== null) {
          fieldValidationErrors.push(_extends({
            name: affectedKey,
            value: val
          }, result));
          return false;
        }

        // If the validator returns false, assume they already
        // called this.addValidationErrors within the function
        if (result === false) return false;

        // Any other return value we assume means it was valid
        return true;
      });
    });

    if (!fieldIsValid) {
      validationErrors = validationErrors.concat(fieldValidationErrors);
    }
  }

  // The recursive function
  function checkObj(_ref2) {
    var val = _ref2.val,
        affectedKey = _ref2.affectedKey,
        operator = _ref2.operator,
        _ref2$isInArrayItemOb = _ref2.isInArrayItemObject,
        isInArrayItemObject = _ref2$isInArrayItemOb === undefined ? false : _ref2$isInArrayItemOb,
        _ref2$isInSubObject = _ref2.isInSubObject,
        isInSubObject = _ref2$isInSubObject === undefined ? false : _ref2$isInSubObject;

    var affectedKeyGeneric = void 0;
    var def = void 0;

    if (affectedKey) {
      // When we hit a blackbox key, we don't progress any further
      if (schema.keyIsInBlackBox(affectedKey)) return;

      // Make a generic version of the affected key, and use that
      // to get the schema for this key.
      affectedKeyGeneric = _mongoObject2.default.makeKeyGeneric(affectedKey);
      def = schema.getDefinition(affectedKey);

      var shouldValidateKey = !keysToValidate || _underscore2.default.any(keysToValidate, function (keyToValidate) {
        return keyToValidate === affectedKey || keyToValidate === affectedKeyGeneric || affectedKey.startsWith(keyToValidate + '.') || affectedKeyGeneric.startsWith(keyToValidate + '.');
      });

      // Perform validation for this key
      if (shouldValidateKey) {
        validate(val, affectedKey, affectedKeyGeneric, def, operator, isInArrayItemObject, isInSubObject);
      }
    }

    // If affectedKeyGeneric is undefined due to this being the first run of this
    // function, objectKeys will return the top-level keys.
    var childKeys = schema.objectKeys(affectedKeyGeneric);

    // Temporarily convert missing objects to empty objects
    // so that the looping code will be called and required
    // descendent keys can be validated.
    if ((val === undefined || val === null) && (!def || !def.optional && childKeys && childKeys.length > 0)) {
      val = {};
    }

    // Loop through arrays
    if (Array.isArray(val)) {
      _underscore2.default.each(val, function (v, i) {
        checkObj({
          val: v,
          affectedKey: affectedKey + '.' + i,
          operator: operator
        });
      });
    } else if ((0, _utility.isObjectWeShouldTraverse)(val) && (!def || schema._blackboxKeys.indexOf(affectedKey) === -1)) {
      // Loop through object keys

      // Get list of present keys
      var presentKeys = Object.keys(val);

      // Check all present keys plus all keys defined by the schema.
      // This allows us to detect extra keys not allowed by the schema plus
      // any missing required keys, and to run any custom functions for other keys.
      var keysToCheck = _underscore2.default.union(presentKeys, childKeys);

      // If this object is within an array, make sure we check for
      // required as if it's not a modifier
      isInArrayItemObject = affectedKeyGeneric && affectedKeyGeneric.slice(-2) === '.$';

      // Check all keys in the merged list
      _underscore2.default.each(keysToCheck, function (key) {
        checkObj({
          val: val[key],
          affectedKey: (0, _utility.appendAffectedKey)(affectedKey, key),
          operator: operator,
          isInArrayItemObject: isInArrayItemObject,
          isInSubObject: true
        });
      });
    }
  }

  function checkModifier(mod) {
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
    _underscore2.default.each(mod, function (opObj, op) {
      // If non-operators are mixed in, throw error
      if (op.slice(0, 1) !== '$') {
        throw new Error('Expected \'' + op + '\' to be a modifier operator like \'$set\'');
      }
      if (shouldCheck(op)) {
        // For an upsert, missing props would not be set if an insert is performed,
        // so we check them all with undefined value to force any 'required' checks to fail
        if (isUpsert && op === '$set') {
          var presentKeys = Object.keys(opObj);
          schema.objectKeys().forEach(function (schemaKey) {
            if (!_underscore2.default.contains(presentKeys, schemaKey)) {
              checkObj({
                val: undefined,
                affectedKey: schemaKey,
                operator: op
              });
            }
          });
        }
        _underscore2.default.each(opObj, function (v, k) {
          if (op === '$push' || op === '$addToSet') {
            if ((typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object' && '$each' in v) {
              v = v.$each;
            } else {
              k = k + '.0';
            }
          }
          checkObj({
            val: v,
            affectedKey: k,
            operator: op
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
  var docValidators = schema._docValidators.concat(_SimpleSchema.SimpleSchema._docValidators);
  docValidators.forEach(function (func) {
    var errors = func(obj);
    if (!Array.isArray(errors)) throw new Error('Custom doc validator must return an array of error objects');
    if (errors.length) validationErrors = validationErrors.concat(errors);
  });

  var addedFieldNames = [];
  validationErrors = _underscore2.default.filter(validationErrors, function (errObj) {
    // Remove error types the user doesn't care about
    if (_underscore2.default.contains(ignoreTypes, errObj.type)) return false;
    // Make sure there is only one error per fieldName
    if (_underscore2.default.contains(addedFieldNames, errObj.name)) return false;

    addedFieldNames.push(errObj.name);
    return true;
  });
  return validationErrors;
}

exports.default = doValidation;