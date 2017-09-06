'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ValidationContext = exports.SimpleSchema = exports.schemaDefinitionOptions = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend2 = require('extend');

var _extend3 = _interopRequireDefault(_extend2);

var _mongoObject = require('mongo-object');

var _mongoObject2 = _interopRequireDefault(_mongoObject);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _messageBox = require('message-box');

var _messageBox2 = _interopRequireDefault(_messageBox);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _humanize = require('./humanize.js');

var _humanize2 = _interopRequireDefault(_humanize);

var _ValidationContext = require('./ValidationContext');

var _ValidationContext2 = _interopRequireDefault(_ValidationContext);

var _SimpleSchemaGroup = require('./SimpleSchemaGroup');

var _SimpleSchemaGroup2 = _interopRequireDefault(_SimpleSchemaGroup);

var _regExp = require('./regExp');

var _regExp2 = _interopRequireDefault(_regExp);

var _clean2 = require('./clean');

var _clean3 = _interopRequireDefault(_clean2);

var _expandShorthand = require('./expandShorthand');

var _expandShorthand2 = _interopRequireDefault(_expandShorthand);

var _utility = require('./utility');

var _defaultMessages = require('./defaultMessages');

var _defaultMessages2 = _interopRequireDefault(_defaultMessages);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Exported for tests
var schemaDefinitionOptions = exports.schemaDefinitionOptions = ['type', 'label', 'optional', 'required', 'autoValue', 'defaultValue'];

var oneOfProps = ['type', 'min', 'max', 'minCount', 'maxCount', 'allowedValues', 'exclusiveMin', 'exclusiveMax', 'regEx', 'custom', 'blackbox', 'trim'];

var propsThatCanBeFunction = ['label', 'optional', 'min', 'max', 'minCount', 'maxCount', 'allowedValues', 'exclusiveMin', 'exclusiveMax', 'regEx'];

var SimpleSchema = function () {
  function SimpleSchema() {
    var schema = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, SimpleSchema);

    this.pick = getPickOrOmit('pick');
    this.omit = getPickOrOmit('omit');

    // Stash the options object
    this._constructorOptions = _extends({}, options);
    if (this._constructorOptions.humanizeAutoLabels !== false) this._constructorOptions.humanizeAutoLabels = true;

    // Custom validators for this instance
    this._validators = [];
    this._docValidators = [];

    // Named validation contexts
    this._validationContexts = {};

    // Schema-level defaults for cleaning
    this._cleanOptions = _extends({
      filter: true,
      autoConvert: true,
      removeEmptyStrings: true,
      trimStrings: true,
      getAutoValues: true,
      removeNullsFromArrays: false,
      extendAutoValueContext: {}
    }, options.clean);

    // Clone, expanding shorthand, and store the schema object in this._schema
    this._schema = {};
    this.extend(schema);

    // Define default validation error messages
    this.messageBox = new _messageBox2.default((0, _clone2.default)(_defaultMessages2.default));

    this.version = SimpleSchema.version;
  }

  _createClass(SimpleSchema, [{
    key: 'findFirstAncestorSimpleSchema',
    value: function findFirstAncestorSimpleSchema(key, func) {
      var _this = this;

      var genericKey = _mongoObject2.default.makeKeyGeneric(key);

      var foundSchema = false;
      (0, _utility.forEachKeyAncestor)(genericKey, function (ancestor) {
        if (foundSchema) return; // skip remaining once we've found it
        var def = _this._schema[ancestor];
        if (!def) return;
        def.type.definitions.forEach(function (typeDef) {
          if (typeDef.type instanceof SimpleSchema) {
            func(typeDef.type, ancestor, genericKey.slice(ancestor.length + 1));
            foundSchema = true;
          }
        });
      });

      return foundSchema;
    }

    /**
     * Returns whether the obj is a SimpleSchema object.
     * @param {Object} [obj] An object to test
     * @returns {Boolean} True if the given object appears to be a SimpleSchema instance
     */

  }, {
    key: 'schema',


    /**
     * @param {String} [key] One specific or generic key for which to get the schema.
     * @returns {Object} The entire schema object or just the definition for one key.
     *
     * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
     * if you want the evaluated definition, where any properties that are functions
     * have been run to produce a result.
     */
    value: function schema(key) {
      if (!key) return this._schema;

      var genericKey = _mongoObject2.default.makeKeyGeneric(key);
      var keySchema = this._schema[genericKey];

      // If not defined in this schema, see if it's defined in a subschema
      if (!keySchema) {
        this.findFirstAncestorSimpleSchema(key, function (simpleSchema, ancestor, subSchemaKey) {
          keySchema = simpleSchema.schema(subSchemaKey);
        });
      }

      return keySchema;
    }

    /**
     * @returns {Object} The entire schema object with subschemas merged. This is the
     * equivalent of what schema() returned in SimpleSchema < 2.0
     *
     * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
     * if you want the evaluated definition, where any properties that are functions
     * have been run to produce a result.
     */

  }, {
    key: 'mergedSchema',
    value: function mergedSchema() {
      var mergedSchema = {};

      _underscore2.default.each(this._schema, function (keySchema, key) {
        mergedSchema[key] = keySchema;

        keySchema.type.definitions.forEach(function (typeDef) {
          if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
          _underscore2.default.each(typeDef.type.mergedSchema(), function (subKeySchema, subKey) {
            mergedSchema[key + '.' + subKey] = subKeySchema;
          });
        });
      });

      return mergedSchema;
    }

    /**
     * Returns the evaluated definition for one key in the schema
     *
     * @param {String} key Generic or specific schema key
     * @param {Array(String)} [propList] Array of schema properties you need; performance optimization
     * @param {Object} [functionContext] The context to use when evaluating schema options that are functions
     * @returns {Object} The schema definition for the requested key
     */

  }, {
    key: 'getDefinition',
    value: function getDefinition(key, propList, functionContext) {
      var _this2 = this;

      var defs = this.schema(key);
      if (!defs) return;

      var getPropIterator = function getPropIterator(obj) {
        return function (val, prop) {
          if (Array.isArray(propList) && !_underscore2.default.contains(propList, prop)) return;
          // For any options that support specifying a function, evaluate the functions
          if (propsThatCanBeFunction.indexOf(prop) > -1 && typeof val === 'function') {
            obj[prop] = val.call(functionContext || {});
            // Inflect label if undefined
            if (prop === 'label' && typeof obj[prop] !== 'string') obj[prop] = inflectedLabel(key, _this2._constructorOptions.humanizeAutoLabels);
          } else {
            obj[prop] = val;
          }
        };
      };

      var result = {};
      _underscore2.default.each(defs, getPropIterator(result));

      // Resolve all the types and convert to a normal array to make it easier
      // to use.
      if (defs.type) {
        result.type = defs.type.definitions.map(function (typeDef) {
          var newTypeDef = {};
          _underscore2.default.each(typeDef, getPropIterator(newTypeDef));
          return newTypeDef;
        });
      }

      return result;
    }

    /**
     * Returns a string identifying the best guess data type for a key. For keys
     * that allow multiple types, the first type is used. This can be useful for
     * building forms.
     *
     * @param {String} key Generic or specific schema key
     * @returns {String} A type string. One of:
     *  string, number, boolean, date, object, stringArray, numberArray, booleanArray,
     *  dateArray, objectArray
     */

  }, {
    key: 'getQuickTypeForKey',
    value: function getQuickTypeForKey(key) {
      var type = void 0;

      var fieldSchema = this.schema(key);
      if (!fieldSchema) return;

      var fieldType = fieldSchema.type.singleType;

      if (fieldType === String) {
        type = 'string';
      } else if (fieldType === Number || fieldType === SimpleSchema.Integer) {
        type = 'number';
      } else if (fieldType === Boolean) {
        type = 'boolean';
      } else if (fieldType === Date) {
        type = 'date';
      } else if (fieldType === Array) {
        var arrayItemFieldSchema = this.schema(key + '.$');
        if (!arrayItemFieldSchema) return;

        var arrayItemFieldType = arrayItemFieldSchema.type.singleType;
        if (arrayItemFieldType === String) {
          type = 'stringArray';
        } else if (arrayItemFieldType === Number || arrayItemFieldType === SimpleSchema.Integer) {
          type = 'numberArray';
        } else if (arrayItemFieldType === Boolean) {
          type = 'booleanArray';
        } else if (arrayItemFieldType === Date) {
          type = 'dateArray';
        } else if (arrayItemFieldType === Object || SimpleSchema.isSimpleSchema(arrayItemFieldType)) {
          type = 'objectArray';
        }
      } else if (fieldType === Object) {
        type = 'object';
      }

      return type;
    }

    /**
     * Given a key that is an Object, returns a new SimpleSchema instance scoped to that object.
     *
     * @param {String} key Generic or specific schema key
     */

  }, {
    key: 'getObjectSchema',
    value: function getObjectSchema(key) {
      var newSchemaDef = {};
      var genericKey = _mongoObject2.default.makeKeyGeneric(key);
      var searchString = genericKey + '.';

      _underscore2.default.each(this.mergedSchema(), function (val, k) {
        if (k.indexOf(searchString) === 0) {
          newSchemaDef[k.slice(searchString.length)] = val;
        }
      });

      return new SimpleSchema(newSchemaDef);
    }

    // Returns an array of all the autovalue functions, including those in subschemas all the
    // way down the schema tree

  }, {
    key: 'autoValueFunctions',
    value: function autoValueFunctions() {
      var result = [];

      function addFuncs(autoValues, closestSubschemaFieldName) {
        _underscore2.default.each(autoValues, function (func, fieldName) {
          result.push({
            func: func,
            fieldName: fieldName,
            closestSubschemaFieldName: closestSubschemaFieldName
          });
        });
      }

      addFuncs(this._autoValues, '');

      _underscore2.default.each(this._schema, function (keySchema, key) {
        keySchema.type.definitions.forEach(function (typeDef) {
          if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
          result = result.concat(typeDef.type.autoValueFunctions().map(function (_ref) {
            var func = _ref.func,
                fieldName = _ref.fieldName,
                closestSubschemaFieldName = _ref.closestSubschemaFieldName;

            return {
              func: func,
              fieldName: key + '.' + fieldName,
              closestSubschemaFieldName: closestSubschemaFieldName.length ? key + '.' + closestSubschemaFieldName : key
            };
          }));
        });
      });

      return result;
    }

    // Returns an array of all the blackbox keys, including those in subschemas

  }, {
    key: 'blackboxKeys',
    value: function blackboxKeys() {
      var blackboxKeys = this._blackboxKeys;
      _underscore2.default.each(this._schema, function (keySchema, key) {
        keySchema.type.definitions.forEach(function (typeDef) {
          if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
          typeDef.type._blackboxKeys.forEach(function (blackboxKey) {
            blackboxKeys.push(key + '.' + blackboxKey);
          });
        });
      });
      return _underscore2.default.uniq(blackboxKeys);
    }

    // Check if the key is a nested dot-syntax key inside of a blackbox object

  }, {
    key: 'keyIsInBlackBox',
    value: function keyIsInBlackBox(key) {
      var _this3 = this;

      var isInBlackBox = false;
      (0, _utility.forEachKeyAncestor)(_mongoObject2.default.makeKeyGeneric(key), function (ancestor, remainder) {
        if (_this3._blackboxKeys.indexOf(ancestor) > -1) {
          isInBlackBox = true;
        } else {
          var testKeySchema = _this3.schema(ancestor);
          if (testKeySchema) {
            testKeySchema.type.definitions.forEach(function (typeDef) {
              if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
              if (typeDef.type.keyIsInBlackBox(remainder)) isInBlackBox = true;
            });
          }
        }
      });
      return isInBlackBox;
    }

    // Returns true if key is explicitly allowed by the schema or implied
    // by other explicitly allowed keys.
    // The key string should have $ in place of any numeric array positions.

  }, {
    key: 'allowsKey',
    value: function allowsKey(key) {
      var _this4 = this;

      // Loop through all keys in the schema
      return _underscore2.default.any(this._schemaKeys, function (loopKey) {
        // If the schema key is the test key, it's allowed.
        if (loopKey === key) return true;

        var fieldSchema = _this4.schema(loopKey);
        var compare1 = key.slice(0, loopKey.length + 2);
        var compare2 = compare1.slice(0, -1);

        // Blackbox and subschema checks are needed only if key starts with
        // loopKey + a dot
        if (compare2 !== loopKey + '.') return false;

        // Black box handling
        if (_this4._blackboxKeys.indexOf(loopKey) > -1) {
          // If the test key is the black box key + ".$", then the test
          // key is NOT allowed because black box keys are by definition
          // only for objects, and not for arrays.
          return compare1 !== loopKey + '.$';
        }

        // Subschemas
        var allowed = false;
        var subKey = key.slice(loopKey.length + 1);
        fieldSchema.type.definitions.forEach(function (typeDef) {
          if (!SimpleSchema.isSimpleSchema(typeDef.type)) return;
          if (typeDef.type.allowsKey(subKey)) allowed = true;
        });
        return allowed;
      });
    }

    /**
     * Returns all the child keys for the object identified by the generic prefix,
     * or all the top level keys if no prefix is supplied.
     *
     * @param {String} [keyPrefix] The Object-type generic key for which to get child keys. Omit for
     *   top-level Object-type keys
     * @returns {[[Type]]} [[Description]]
     */

  }, {
    key: 'objectKeys',
    value: function objectKeys(keyPrefix) {
      if (!keyPrefix) return this._firstLevelSchemaKeys;
      return this._objectKeys[keyPrefix + '.'] || [];
    }

    /**
     * Extends this schema with another schema, key by key.
     *
     * @param {SimpleSchema|Object} schema
     * @returns The SimpleSchema instance (chainable)
     */

  }, {
    key: 'extend',
    value: function extend() {
      var _this5 = this;

      var schema = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var schemaObj = void 0;
      if (SimpleSchema.isSimpleSchema(schema)) {
        schemaObj = schema._schema;
        // Merge the validators
        this._validators = this._validators.concat(schema._validators);
        this._docValidators = this._docValidators.concat(schema._docValidators);
        // Merge the clean options
        this._cleanOptions = (0, _extend3.default)(true, {}, this._cleanOptions, schema._cleanOptions);
      } else {
        schemaObj = (0, _expandShorthand2.default)(schema);
      }

      // Update all of the information cached on the instance
      _underscore2.default.each(schemaObj, function (definition, fieldName) {
        definition = (0, _clone2.default)(definition);
        standardizeDefinition(definition);

        // Merge/extend with any existing definition
        if (_this5._schema[fieldName]) {
          _this5._schema[fieldName] = _extends({}, _this5._schema[fieldName], _underscore2.default.omit(definition, 'type'));
          if (definition.type) _this5._schema[fieldName].type.extend(definition.type);
        } else {
          _this5._schema[fieldName] = definition;
        }

        checkAndScrubDefinition(fieldName, _this5._schema[fieldName], _this5._constructorOptions, schemaObj);
      });

      checkSchemaOverlap(this._schema);

      // Set/Reset all of these
      this._schemaKeys = [];
      this._autoValues = {};
      this._blackboxKeys = [];
      this._firstLevelSchemaKeys = [];
      this._depsLabels = {};
      this._objectKeys = {};

      _underscore2.default.each(this._schema, function (definition, fieldName) {
        // Keep list of all keys for speedier checking
        _this5._schemaKeys.push(fieldName);

        // Keep list of all top level keys
        if (fieldName.indexOf('.') === -1) _this5._firstLevelSchemaKeys.push(fieldName);

        // Initialize label reactive dependency (Meteor only)
        if (_this5._constructorOptions.tracker) {
          _this5._depsLabels[fieldName] = new _this5._constructorOptions.tracker.Dependency();
        }

        // Keep list of all blackbox keys for passing to MongoObject constructor
        // XXX For now if any oneOf type is blackbox, then the whole field is.
        _underscore2.default.every(definition.type.definitions, function (oneOfDef) {
          if (oneOfDef.blackbox === true) {
            _this5._blackboxKeys.push(fieldName);
            return false; // exit loop
          }
          return true;
        });

        // Keep list of autoValue functions by key
        if (definition.autoValue) _this5._autoValues[fieldName] = definition.autoValue;
      });

      // Store child keys keyed by parent. This needs to be done recursively to handle
      // subschemas.
      var setObjectKeys = function setObjectKeys(curSchema, schemaParentKey) {
        _underscore2.default.each(curSchema, function (definition, fieldName) {
          fieldName = schemaParentKey ? schemaParentKey + '.' + fieldName : fieldName;
          if (fieldName.indexOf('.') > -1 && fieldName.slice(-2) !== '.$') {
            var parentKey = fieldName.slice(0, fieldName.lastIndexOf('.'));
            var parentKeyWithDot = parentKey + '.';
            _this5._objectKeys[parentKeyWithDot] = _this5._objectKeys[parentKeyWithDot] || [];
            _this5._objectKeys[parentKeyWithDot].push(fieldName.slice(fieldName.lastIndexOf('.') + 1));
          }

          // If the current field is a nested SimpleSchema,
          // iterate over the child fields and cache their properties as well
          definition.type.definitions.forEach(function (_ref2) {
            var type = _ref2.type;

            if (SimpleSchema.isSimpleSchema(type)) {
              setObjectKeys(type._schema, fieldName);
            }
          });
        });
      };

      setObjectKeys(this._schema);

      return this;
    }
  }, {
    key: 'getAllowedValuesForKey',
    value: function getAllowedValuesForKey(key) {
      // For array fields, `allowedValues` is on the array item definition
      if (this.allowsKey(key + '.$')) {
        key = key + '.$';
      }

      var defs = this.getDefinition(key, ['allowedValues']);

      return defs && defs.type[0].allowedValues;
    }
  }, {
    key: 'newContext',
    value: function newContext() {
      return new _ValidationContext2.default(this);
    }
  }, {
    key: 'namedContext',
    value: function namedContext(name) {
      if (typeof name !== 'string') name = 'default';
      if (!this._validationContexts[name]) {
        this._validationContexts[name] = new SimpleSchema.ValidationContext(this);
      }
      return this._validationContexts[name];
    }
  }, {
    key: 'addValidator',
    value: function addValidator(func) {
      this._validators.push(func);
    }
  }, {
    key: 'addDocValidator',
    value: function addDocValidator(func) {
      this._docValidators.push(func);
    }

    /**
     * @param obj {Object|Object[]} Object or array of objects to validate.
     * @param [options] {Object} Same options object that ValidationContext#validate takes
     *
     * Throws an Error with name `ClientError` and `details` property containing the errors.
     */

  }, {
    key: 'validate',
    value: function validate(obj, options) {
      var _this6 = this;

      // For Meteor apps, `check` option can be passed to silence audit-argument-checks
      if (typeof this._constructorOptions.check === 'function') {
        // Call check but ignore the error
        try {
          this._constructorOptions.check(obj);
        } catch (e) {/* ignore error */}
      }

      // obj can be an array, in which case we validate each object in it and
      // throw as soon as one has an error
      var objects = Array.isArray(obj) ? obj : [obj];
      objects.forEach(function (oneObj) {
        var validationContext = _this6.newContext();
        var isValid = validationContext.validate(oneObj, options);

        if (isValid) return;

        var errors = validationContext.validationErrors();

        // In order for the message at the top of the stack trace to be useful,
        // we set it to the first validation error message.
        var message = _this6.messageForError(errors[0]);

        var error = new Error(message);

        error.name = error.errorType = 'ClientError';
        error.error = 'validation-error';

        // Add meaningful error messages for each validation error.
        // Useful for display messages when using 'mdg:validated-method'.
        error.details = errors.map(function (errorDetail) {
          return _extends({}, errorDetail, { message: _this6.messageForError(errorDetail) });
        });

        // The primary use for the validationErrorTransform is to convert the
        // vanilla Error into a Meteor.Error until DDP is able to pass
        // vanilla errors back to the client.
        if (typeof SimpleSchema.validationErrorTransform === 'function') {
          throw SimpleSchema.validationErrorTransform(error);
        } else {
          throw error;
        }
      });
    }
  }, {
    key: 'validator',
    value: function validator() {
      var _this7 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return function (obj) {
        var optionsClone = _extends({}, options);
        if (options.clean === true) {
          // Do this here and pass into both functions for better performance
          optionsClone.mongoObject = new _mongoObject2.default(obj, _this7.blackboxKeys());
          _this7.clean(obj, optionsClone);
        }
        _this7.validate(obj, optionsClone);
      };
    }
  }, {
    key: 'clean',
    value: function clean() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _clean3.default.apply(undefined, [this].concat(args));
    }

    /**
     * Change schema labels on the fly, causing mySchema.label computation
     * to rerun. Useful when the user changes the language.
     *
     * @param {Object} labels A dictionary of all the new label values, by schema key.
     */

  }, {
    key: 'labels',
    value: function labels(_labels) {
      var _this8 = this;

      _underscore2.default.each(_labels, function (label, key) {
        if (typeof label !== 'string' && typeof label !== 'function') return;
        if (!_this8._schema.hasOwnProperty(key)) return;

        _this8._schema[key].label = label;
        _this8._depsLabels[key] && _this8._depsLabels[key].changed();
      });
    }

    /**
     * Gets a field's label or all field labels reactively.
     *
     * @param {String} [key] The schema key, specific or generic.
     *   Omit this argument to get a dictionary of all labels.
     * @returns {String} The label
     */

  }, {
    key: 'label',
    value: function label(key) {
      var _this9 = this;

      // Get all labels
      if (key === null || key === undefined) {
        var result = {};
        _underscore2.default.each(this._schemaKeys, function (schemaKey) {
          result[schemaKey] = _this9.label(schemaKey);
        });
        return result;
      }

      // Get label for one field
      var def = this.getDefinition(key, ['label']);
      if (!def) return null;

      var genericKey = _mongoObject2.default.makeKeyGeneric(key);
      this._depsLabels[genericKey] && this._depsLabels[genericKey].depend();
      return def.label;
    }

    /**
     * Gets a field's property
     *
     * @param {String} [key] The schema key, specific or generic.
     *   Omit this argument to get a dictionary of all labels.
     * @param {String} [prop] Name of the property to get.
     *
     * @returns {any} The property value
     */

  }, {
    key: 'get',
    value: function get(key, prop) {
      var def = this.getDefinition(key, ['type', prop]);

      if (!def) return undefined;

      if (_underscore2.default.contains(schemaDefinitionOptions, prop)) {
        return def[prop];
      }

      return (def.type.find(function (props) {
        return props[prop];
      }) || {})[prop];
    }

    // shorthand for getting defaultValue

  }, {
    key: 'defaultValue',
    value: function defaultValue(key) {
      return this.get(key, 'defaultValue');
    }

    // Returns a string message for the given error type and key. Passes through
    // to message-box pkg.

  }, {
    key: 'messageForError',
    value: function messageForError(errorInfo) {
      var name = errorInfo.name;


      return this.messageBox.message(errorInfo, {
        context: {
          key: name, // backward compatibility

          // The call to this.label() establishes a reactive dependency, too
          label: this.label(name)
        }
      });
    }

    /**
     * @method SimpleSchema#pick
     * @param {[fields]} The list of fields to pick to instantiate the subschema
     * @returns {SimpleSchema} The subschema
     */


    /**
     * @method SimpleSchema#omit
     * @param {[fields]} The list of fields to omit to instantiate the subschema
     * @returns {SimpleSchema} The subschema
     */

  }], [{
    key: 'isSimpleSchema',
    value: function isSimpleSchema(obj) {
      return obj && (obj instanceof SimpleSchema || obj._schema);
    }
  }, {
    key: 'extendOptions',


    // If you need to allow properties other than those listed above, call this from your app or package
    value: function extendOptions(options) {
      // For backwards compatibility we still take an object here, but we only care about the names
      if (!Array.isArray(options)) options = Object.keys(options);
      options.forEach(function (option) {
        schemaDefinitionOptions.push(option);
      });
    }
  }, {
    key: 'defineValidationErrorTransform',
    value: function defineValidationErrorTransform(transform) {
      if (typeof transform !== 'function') {
        throw new Error('SimpleSchema.defineValidationErrorTransform must be passed a function that accepts an Error and returns an Error');
      }
      SimpleSchema.validationErrorTransform = transform;
    }
  }, {
    key: 'validate',
    value: function validate(obj, schema, options) {
      // Allow passing just the schema object
      if (!SimpleSchema.isSimpleSchema(schema)) {
        schema = new SimpleSchema(schema);
      }

      return schema.validate(obj, options);
    }
  }, {
    key: 'oneOf',
    value: function oneOf() {
      for (var _len2 = arguments.length, definitions = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        definitions[_key2] = arguments[_key2];
      }

      return new (Function.prototype.bind.apply(_SimpleSchemaGroup2.default, [null].concat(definitions)))();
    }

    // Global custom validators

  }, {
    key: 'addValidator',
    value: function addValidator(func) {
      SimpleSchema._validators.push(func);
    }
  }, {
    key: 'addDocValidator',
    value: function addDocValidator(func) {
      SimpleSchema._docValidators.push(func);
    }

    // Backwards compatibility

  }]);

  return SimpleSchema;
}();

/*
 * PRIVATE
 */

// Throws an error if any fields are `type` SimpleSchema but then also
// have subfields defined outside of that.


SimpleSchema.version = 2;
SimpleSchema.RegEx = _regExp2.default;
SimpleSchema._validators = [];
SimpleSchema._docValidators = [];
SimpleSchema.ErrorTypes = {
  REQUIRED: 'required',
  MIN_STRING: 'minString',
  MAX_STRING: 'maxString',
  MIN_NUMBER: 'minNumber',
  MAX_NUMBER: 'maxNumber',
  MIN_NUMBER_EXCLUSIVE: 'minNumberExclusive',
  MAX_NUMBER_EXCLUSIVE: 'maxNumberExclusive',
  MIN_DATE: 'minDate',
  MAX_DATE: 'maxDate',
  BAD_DATE: 'badDate',
  MIN_COUNT: 'minCount',
  MAX_COUNT: 'maxCount',
  MUST_BE_INTEGER: 'noDecimal',
  VALUE_NOT_ALLOWED: 'notAllowed',
  EXPECTED_TYPE: 'expectedType',
  FAILED_REGULAR_EXPRESSION: 'regEx',
  KEY_NOT_IN_SCHEMA: 'keyNotInSchema'
};
SimpleSchema.Integer = 'SimpleSchema.Integer';
SimpleSchema._makeGeneric = _mongoObject2.default.makeKeyGeneric;
SimpleSchema.ValidationContext = _ValidationContext2.default;

SimpleSchema.setDefaultMessages = function (messages) {
  (0, _extend3.default)(true, _defaultMessages2.default, messages);
};

function checkSchemaOverlap(schema) {
  _underscore2.default.each(schema, function (val, key) {
    _underscore2.default.each(val.type.definitions, function (def) {
      if (!SimpleSchema.isSimpleSchema(def.type)) return;

      _underscore2.default.each(def.type._schema, function (subVal, subKey) {
        var newKey = key + '.' + subKey;
        if (key !== '$' && schema.hasOwnProperty(newKey)) {
          throw new Error('The type for "' + key + '" is set to a SimpleSchema instance that defines "' + key + '.' + subKey + '", but the parent SimpleSchema instance also tries to define "' + key + '.' + subKey + '"');
        }
      });
    });
  });
}

/**
 * @param {String} fieldName The full generic schema key
 * @param {Boolean} shouldHumanize Humanize it
 * @returns {String} A label based on the key
 */
function inflectedLabel(fieldName, shouldHumanize) {
  var pieces = fieldName.split('.');
  var label = void 0;
  do {
    label = pieces.pop();
  } while (label === '$' && pieces.length);
  return shouldHumanize ? (0, _humanize2.default)(label) : label;
}

function getDefaultAutoValueFunction(defaultValue) {
  return function defaultAutoValueFunction() {
    if (this.isSet) return;
    if (this.operator === null) return defaultValue;
    // We don't know whether it's an upsert, but if it's not, this seems to be ignored,
    // so this is a safe way to make sure the default value is added on upsert insert.
    return { $setOnInsert: defaultValue };
  };
}

// Mutates def into standardized object with SimpleSchemaGroup type
function standardizeDefinition(def) {
  // Internally, all definition types are stored as groups for simplicity of access
  if (def.type && !(def.type instanceof _SimpleSchemaGroup2.default)) {
    def.type = new _SimpleSchemaGroup2.default(_underscore2.default.pick(def, oneOfProps));
  }

  _underscore2.default.without(oneOfProps, 'type').forEach(function (prop) {
    delete def[prop];
  });
}

// Checks and mutates definition. Clone it first.
function checkAndScrubDefinition(fieldName, definition, options, fullSchemaObj) {
  if (!definition.type) throw new Error(fieldName + ' key is missing "type"');

  // Validate the field definition
  _underscore2.default.each(definition, function (val, key) {
    if (schemaDefinitionOptions.indexOf(key) === -1) {
      throw new Error('Invalid definition for ' + fieldName + ' field: "' + key + '" is not a supported property');
    }
  });

  // Make sure the `type`s are OK
  definition.type.definitions.forEach(function (_ref3) {
    var type = _ref3.type;

    if (!type) throw new Error('Invalid definition for ' + fieldName + ' field: "type" option is required');

    if (Array.isArray(type)) {
      throw new Error('Invalid definition for ' + fieldName + ' field: "type" may not be an array. Change it to Array.');
    }

    if (SimpleSchema.isSimpleSchema(type)) {
      _underscore2.default.each(type._schema, function (subVal, subKey) {
        var newKey = fieldName + '.' + subKey;
        if (fieldName !== '$' && fullSchemaObj.hasOwnProperty(newKey)) {
          throw new Error('The type for "' + fieldName + '" is set to a SimpleSchema instance that defines "' + newKey + '", but the parent SimpleSchema instance also tries to define "' + newKey + '"');
        }
      });
    }
  });

  // defaultValue -> autoValue
  // We support defaultValue shortcut by converting it immediately into an
  // autoValue.

  if ('defaultValue' in definition) {
    if ('autoValue' in definition && definition.autoValue.name !== 'defaultAutoValueFunction') {
      console.warn('SimpleSchema: Found both autoValue and defaultValue options for "' + fieldName + '". Ignoring defaultValue.');
    } else {
      if (fieldName.endsWith('.$')) {
        throw new Error('An array item field (one that ends with ".$") cannot have defaultValue.');
      }
      definition.autoValue = getDefaultAutoValueFunction(definition.defaultValue);
    }
  }

  // REQUIREDNESS
  if (fieldName.endsWith('.$')) {
    definition.optional = true;
  } else {
    if (!definition.hasOwnProperty('optional')) {
      if (definition.hasOwnProperty('required')) {
        if (typeof definition.required === 'function') {
          definition.optional = function optional() {
            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
              args[_key3] = arguments[_key3];
            }

            return !definition.required.apply(this, args);
          };
        } else {
          definition.optional = !definition.required;
        }
      } else {
        definition.optional = options.requiredByDefault === false;
      }
    }
  }

  delete definition.required;

  // LABELS
  if (!definition.hasOwnProperty('label')) {
    if (options.defaultLabel) {
      definition.label = options.defaultLabel;
    } else if (SimpleSchema.defaultLabel) {
      definition.label = SimpleSchema.defaultLabel;
    } else {
      definition.label = inflectedLabel(fieldName, options.humanizeAutoLabels);
    }
  }
}

function getPickOrOmit(type) {
  return function pickOrOmit() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    // If they are picking/omitting an object or array field, we need to also include everything under it
    var newSchema = {};
    _underscore2.default.each(this._schema, function (value, key) {
      // Pick/omit it if it IS in the array of keys they want OR if it
      // STARTS WITH something that is in the array plus a period
      var includeIt = _underscore2.default.any(args, function (wantedField) {
        return key === wantedField || key.indexOf(wantedField + '.') === 0;
      });

      if (includeIt && type === 'pick' || !includeIt && type === 'omit') {
        newSchema[key] = value;
      }
    });

    var subSchema = new SimpleSchema(newSchema, this._constructorOptions);
    subSchema.messageBox = this.messageBox;
    return subSchema;
  };
}

exports.SimpleSchema = SimpleSchema;
exports.ValidationContext = _ValidationContext2.default;