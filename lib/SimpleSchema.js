import deepExtend from 'deep-extend';
import MongoObject from 'mongo-object';
import _ from 'underscore';
import MessageBox from 'message-box';
import clone from 'clone';
import humanize from './humanize.js';
import ValidationContext from './ValidationContext';
import SimpleSchemaGroup from './SimpleSchemaGroup';
import regExpObj from './regExp';
import clean from './clean';
import expandShorthand from './expandShorthand';
import { forEachKeyAncestor } from './utility';
import defaultMessages from './defaultMessages';

// Exported for tests
export const schemaDefinitionOptions = [
  'type',
  'label',
  'optional',
  'required',
  'autoValue',
  'defaultValue',
];

const oneOfProps = [
  'type',
  'min',
  'max',
  'minCount',
  'maxCount',
  'allowedValues',
  'exclusiveMin',
  'exclusiveMax',
  'regEx',
  'custom',
  'blackbox',
  'trim',
];

const propsThatCanBeFunction = [
  'label',
  'optional',
  'min',
  'max',
  'minCount',
  'maxCount',
  'allowedValues',
  'exclusiveMin',
  'exclusiveMax',
  'regEx',
];

class SimpleSchema {
  constructor(schema = {}, options = {}) {
    // Stash the options object
    this._constructorOptions = { ...options };
    if (this._constructorOptions.humanizeAutoLabels !== false) this._constructorOptions.humanizeAutoLabels = true;

    // Custom validators for this instance
    this._validators = [];
    this._docValidators = [];

    // Named validation contexts
    this._validationContexts = {};

    // Clone, expanding shorthand, and store the schema object in this._schema
    this._schema = {};
    this.extend(schema);

    // Define default validation error messages
    this.messageBox = new MessageBox(clone(defaultMessages));

    // Schema-level defaults for cleaning
    this._cleanOptions = {
      filter: true,
      autoConvert: true,
      removeEmptyStrings: true,
      trimStrings: true,
      getAutoValues: true,
      removeNullsFromArrays: false,
      extendAutoValueContext: {},
      ...options.clean,
    };

    this.version = SimpleSchema.version;
  }

  findFirstAncestorSimpleSchema(key, func) {
    const genericKey = MongoObject.makeKeyGeneric(key);

    let foundSchema = false;
    forEachKeyAncestor(genericKey, (ancestor) => {
      if (foundSchema) return; // skip remaining once we've found it
      const def = this._schema[ancestor];
      if (!def) return;
      def.type.definitions.forEach(typeDef => {
        if (typeDef.type instanceof SimpleSchema) {
          func(typeDef.type, ancestor, genericKey.slice(ancestor.length + 1));
          foundSchema = true;
        }
      });
    });

    return foundSchema;
  }

  /**
   * @param {String} [key] One specific or generic key for which to get the schema.
   * @returns {Object} The entire schema object or just the definition for one key.
   *
   * Note that this returns the raw, unevaluated definition object. Use `getDefinition`
   * if you want the evaluated definition, where any properties that are functions
   * have been run to produce a result.
   */
  schema(key) {
    if (!key) return this._schema;

    const genericKey = MongoObject.makeKeyGeneric(key);
    let keySchema = this._schema[genericKey];

    // If not defined in this schema, see if it's defined in a subschema
    if (!keySchema) {
      this.findFirstAncestorSimpleSchema(key, (simpleSchema, ancestor, subSchemaKey) => {
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
  mergedSchema() {
    const mergedSchema = {};

    _.each(this._schema, (keySchema, key) => {
      mergedSchema[key] = keySchema;

      keySchema.type.definitions.forEach(typeDef => {
        if (!(typeDef.type instanceof SimpleSchema)) return;
        _.each(typeDef.type.mergedSchema(), (subKeySchema, subKey) => {
          mergedSchema[`${key}.${subKey}`] = subKeySchema;
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
  getDefinition(key, propList, functionContext) {
    const defs = this.schema(key);
    if (!defs) return;

    const getPropIterator = obj => {
      return (val, prop) => {
        if (Array.isArray(propList) && !_.contains(propList, prop)) return;
        // For any options that support specifying a function, evaluate the functions
        if (propsThatCanBeFunction.indexOf(prop) > -1 && typeof val === 'function') {
          obj[prop] = val.call(functionContext || {});
          // Inflect label if undefined
          if (prop === 'label' && typeof obj[prop] !== 'string') obj[prop] = inflectedLabel(key, this._constructorOptions.humanizeAutoLabels);
        } else {
          obj[prop] = val;
        }
      };
    };

    const result = {};
    _.each(defs, getPropIterator(result));

    // Resolve all the types and convert to a normal array to make it easier
    // to use.
    if (defs.type) {
      result.type = defs.type.definitions.map(typeDef => {
        const newTypeDef = {};
        _.each(typeDef, getPropIterator(newTypeDef));
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
   *  string, number, boolean, date, stringArray, numberArray, booleanArray,
   *  dateArray, object
   */
  getQuickTypeForKey(key) {
    let type;

    const fieldSchema = this.schema(key);
    if (!fieldSchema) return;

    const fieldType = fieldSchema.type.singleType;

    if (fieldType === String) {
      type = 'string';
    } else if (fieldType === Number || fieldType === SimpleSchema.Integer) {
      type = 'number';
    } else if (fieldType === Boolean) {
      type = 'boolean';
    } else if (fieldType === Date) {
      type = 'date';
    } else if (fieldType === Array) {
      const arrayItemFieldSchema = this.schema(`${key}.$`);
      if (!arrayItemFieldSchema) return;

      const arrayItemFieldType = arrayItemFieldSchema.type.singleType;
      if (arrayItemFieldType === String) {
        type = 'stringArray';
      } else if (arrayItemFieldType === Number || arrayItemFieldType === SimpleSchema.Integer) {
        type = 'numberArray';
      } else if (arrayItemFieldType === Boolean) {
        type = 'booleanArray';
      } else if (arrayItemFieldType === Date) {
        type = 'dateArray';
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
  getObjectSchema(key) {
    const newSchemaDef = {};
    const genericKey = MongoObject.makeKeyGeneric(key);
    const searchString = `${genericKey}.`;

    _.each(this.mergedSchema(), function (val, k) {
      if (k.indexOf(searchString) === 0) {
        newSchemaDef[k.slice(searchString.length)] = val;
      }
    });

    return new SimpleSchema(newSchemaDef);
  }

  // Returns an array of all the autovalue functions, including those in subschemas all the
  // way down the schema tree
  autoValueFunctions() {
    let result = [];

    function addFuncs(autoValues, closestSubschemaFieldName) {
      _.each(autoValues, (func, fieldName) => {
        result.push({
          func,
          fieldName,
          closestSubschemaFieldName,
        });
      });
    }

    addFuncs(this._autoValues, '');

    _.each(this._schema, (keySchema, key) => {
      keySchema.type.definitions.forEach(typeDef => {
        if (!(typeDef.type instanceof SimpleSchema)) return;
        result = result.concat(typeDef.type.autoValueFunctions().map(({
          func,
          fieldName,
          closestSubschemaFieldName,
        }) => {
          return {
            func,
            fieldName: `${key}.${fieldName}`,
            closestSubschemaFieldName: closestSubschemaFieldName.length ? `${key}.${closestSubschemaFieldName}` : key,
          };
        }));
      });
    });

    return result;
  }

  // Returns an array of all the blackbox keys, including those in subschemas
  blackboxKeys() {
    const blackboxKeys = this._blackboxKeys;
    _.each(this._schema, (keySchema, key) => {
      keySchema.type.definitions.forEach(typeDef => {
        if (!(typeDef.type instanceof SimpleSchema)) return;
        typeDef.type._blackboxKeys.forEach(blackboxKey => {
          blackboxKeys.push(`${key}.${blackboxKey}`);
        });
      });
    });
    return _.uniq(blackboxKeys);
  }

  // Check if the key is a nested dot-syntax key inside of a blackbox object
  keyIsInBlackBox(key) {
    let isInBlackBox = false;
    forEachKeyAncestor(MongoObject.makeKeyGeneric(key), (ancestor, remainder) => {
      if (this._blackboxKeys.indexOf(ancestor) > -1) {
        isInBlackBox = true;
      } else {
        const testKeySchema = this.schema(ancestor);
        if (testKeySchema) {
          testKeySchema.type.definitions.forEach(typeDef => {
            if (!(typeDef.type instanceof SimpleSchema)) return;
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
  allowsKey(key) {
    // Loop through all keys in the schema
    return _.any(this._schemaKeys, loopKey => {
      // If the schema key is the test key, it's allowed.
      if (loopKey === key) return true;

      const fieldSchema = this.schema(loopKey);
      const compare1 = key.slice(0, loopKey.length + 2);
      const compare2 = compare1.slice(0, -1);

      // Blackbox and subschema checks are needed only if key starts with
      // loopKey + a dot
      if (compare2 !== `${loopKey}.`) return false;

      // Black box handling
      if (fieldSchema.blackbox === true) {
        // If the test key is the black box key + ".$", then the test
        // key is NOT allowed because black box keys are by definition
        // only for objects, and not for arrays.
        return compare1 !== `${loopKey}.$`;
      }

      // Subschemas
      let allowed = false;
      const subKey = key.slice(loopKey.length + 1);
      fieldSchema.type.definitions.forEach(typeDef => {
        if (!(typeDef.type instanceof SimpleSchema)) return;
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
  objectKeys(keyPrefix) {
    if (!keyPrefix) return this._firstLevelSchemaKeys;
    return this._objectKeys[`${keyPrefix}.`] || [];
  }

  /**
   * Extends this schema with another schema, key by key.
   *
   * @param {SimpleSchema|Object} schema
   * @returns The SimpleSchema instance (chainable)
   */
  extend(schema = {}) {
    let schemaObj;
    if (schema instanceof SimpleSchema) {
      schemaObj = schema._schema;
      // Merge the validators
      this._validators = this._validators.concat(schema._validators);
      this._docValidators = this._docValidators.concat(schema._docValidators);
    } else {
      schemaObj = expandShorthand(schema);
    }

    // Extend this._schema with additional fields and definitions from schema
    this._schema = mergeSchemas([this._schema, schemaObj]);

    checkSchemaOverlap(this._schema);

    // Set/Reset all of these
    this._schemaKeys = [];
    this._autoValues = {};
    this._blackboxKeys = [];
    this._firstLevelSchemaKeys = [];
    this._depsLabels = {};
    this._objectKeys = {};

    // Update all of the information cached on the instance
    _.each(this._schema, (definition, fieldName) => {
      this._schema[fieldName] = definition = checkAndScrubDefinition(fieldName, definition, this._constructorOptions, this._schema);

      // Keep list of all keys for speedier checking
      this._schemaKeys.push(fieldName);

      // Keep list of all top level keys
      if (fieldName.indexOf('.') === -1) this._firstLevelSchemaKeys.push(fieldName);

      // Initialize label reactive dependency (Meteor only)
      if (this._constructorOptions.tracker) {
        this._depsLabels[fieldName] = new this._constructorOptions.tracker.Dependency();
      }

      // Keep list of all blackbox keys for passing to MongoObject constructor
      if (definition.blackbox) this._blackboxKeys.push(fieldName);

      // Keep list of autoValue functions by key
      if (definition.autoValue) this._autoValues[fieldName] = definition.autoValue;
    });

    // Store child keys keyed by parent. This needs to be done recursively to handle
    // subschemas.
    const setObjectKeys = (curSchema, schemaParentKey) => {
      _.each(curSchema, (definition, fieldName) => {
        fieldName = schemaParentKey ? `${schemaParentKey}.${fieldName}` : fieldName;
        if (fieldName.indexOf('.') > -1 && fieldName.slice(-2) !== '.$') {
          const parentKey = fieldName.slice(0, fieldName.lastIndexOf('.'));
          const parentKeyWithDot = `${parentKey}.`;
          this._objectKeys[parentKeyWithDot] = this._objectKeys[parentKeyWithDot] || [];
          this._objectKeys[parentKeyWithDot].push(fieldName.slice(fieldName.lastIndexOf('.') + 1));
        }

        // If the current field is a nested SimpleSchema,
        // iterate over the child fields and cache their properties as well
        definition.type.definitions.forEach(({ type }) => {
          if (type instanceof SimpleSchema) {
            setObjectKeys(type._schema, fieldName);
          }
        });
      });
    };

    setObjectKeys(this._schema);

    return this;
  }

  getAllowedValuesForKey(key) {
    // For array fields, `allowedValues` is on the array item definition
    if (this.allowsKey(`${key}.$`)) {
      key = `${key}.$`;
    }

    const defs = this.getDefinition(key, ['allowedValues']);

    return defs && defs.type[0].allowedValues;
  }

  newContext() {
    return new ValidationContext(this);
  }

  namedContext(name) {
    if (typeof name !== 'string') name = 'default';
    if (!this._validationContexts[name]) {
      this._validationContexts[name] = new SimpleSchema.ValidationContext(this);
    }
    return this._validationContexts[name];
  }

  addValidator(func) {
    this._validators.push(func);
  }

  addDocValidator(func) {
    this._docValidators.push(func);
  }

  /**
   * @param obj {Object|Object[]} Object or array of objects to validate.
   * @param [options] {Object} Same options object that ValidationContext#validate takes
   *
   * Throws an Error with name `ClientError` and `details` property containing the errors.
   */
  validate(obj, options) {
    // For Meteor apps, `check` option can be passed to silence audit-argument-checks
    if (typeof this._constructorOptions.check === 'function') {
      // Call check but ignore the error
      try { this._constructorOptions.check(obj); } catch (e) { /* ignore error */ }
    }

    // obj can be an array, in which case we validate each object in it and
    // throw as soon as one has an error
    const objects = Array.isArray(obj) ? obj : [obj];
    objects.forEach(oneObj => {
      const validationContext = this.newContext();
      const isValid = validationContext.validate(oneObj, options);

      if (isValid) return;

      const errors = validationContext.validationErrors();

      // In order for the message at the top of the stack trace to be useful,
      // we set it to the first validation error message.
      const message = this.messageForError(errors[0]);

      const error = new Error(message);
      error.name = error.errorType = 'ClientError';
      error.details = errors;
      error.error = 'validation-error';

      // The primary use for the validationErrorTransform is for the Meteor package
      // to convert the vanilla Error into a Meteor.Error until DDP is able to pass
      // vanilla errors back to the client.
      if (typeof SimpleSchema.validationErrorTransform === 'function') {
        throw SimpleSchema.validationErrorTransform(error);
      } else {
        throw error;
      }
    });
  }

  validator(options = {}) {
    return (obj) => {
      const optionsClone = { ...options };
      if (options.clean === true) {
        // Do this here and pass into both functions for better performance
        optionsClone.mongoObject = new MongoObject(obj, this.blackboxKeys());
        this.clean(obj, optionsClone);
      }
      this.validate(obj, optionsClone);
    };
  }

  clean(...args) {
    return clean(this, ...args);
  }

  /**
   * Change schema labels on the fly, causing mySchema.label computation
   * to rerun. Useful when the user changes the language.
   *
   * @param {Object} labels A dictionary of all the new label values, by schema key.
   */
  labels(labels) {
    _.each(labels, (label, key) => {
      if (typeof label !== 'string' && typeof label !== 'function') return;
      if (!this._schema.hasOwnProperty(key)) return;

      this._schema[key].label = label;
      this._depsLabels[key] && this._depsLabels[key].changed();
    });
  }

  /**
   * Gets a field's label or all field labels reactively.
   *
   * @param {String} [key] The schema key, specific or generic.
   *   Omit this argument to get a dictionary of all labels.
   * @returns {String} The label
   */
  label(key) {
    // Get all labels
    if (key === null || key === undefined) {
      const result = {};
      _.each(this._schemaKeys, (schemaKey) => {
        result[schemaKey] = this.label(schemaKey);
      });
      return result;
    }

    // Get label for one field
    const def = this.getDefinition(key, ['label']);
    if (!def) return null;

    const genericKey = MongoObject.makeKeyGeneric(key);
    this._depsLabels[genericKey] && this._depsLabels[genericKey].depend();
    return def.label;
  }

  // Returns a string message for the given error type and key. Passes through
  // to message-box pkg.
  messageForError(errorInfo) {
    const { name } = errorInfo;

    return this.messageBox.message(errorInfo, {
      context: {
        key: name, // backward compatibility

        // The call to this.label() establishes a reactive dependency, too
        label: this.label(name),
      },
    });
  }

  /**
   * @method SimpleSchema#pick
   * @param {[fields]} The list of fields to pick to instantiate the subschema
   * @returns {SimpleSchema} The subschema
   */
  pick = getPickOrOmit('pick');

  /**
   * @method SimpleSchema#omit
   * @param {[fields]} The list of fields to omit to instantiate the subschema
   * @returns {SimpleSchema} The subschema
   */
  omit = getPickOrOmit('omit');

  static version = 2;

  // If you need to allow properties other than those listed above, call this from your app or package
  static extendOptions(options) {
    // For backwards compatibility we still take an object here, but we only care about the names
    if (!Array.isArray(options)) options = Object.keys(options);
    options.forEach(option => {
      schemaDefinitionOptions.push(option);
    });
  }

  static defineValidationErrorTransform(transform) {
    if (typeof transform !== 'function') {
      throw new Error('SimpleSchema.defineValidationErrorTransform must be passed a function that accepts an Error and returns an Error');
    }
    SimpleSchema.validationErrorTransform = transform;
  }

  static validate(obj, schema, options) {
    // Allow passing just the schema object
    if (!(schema instanceof SimpleSchema)) {
      schema = new SimpleSchema(schema);
    }

    return schema.validate(obj, options);
  }

  static oneOf(...definitions) {
    return new SimpleSchemaGroup(...definitions);
  }

  static RegEx = regExpObj;

  // Global custom validators
  static _validators = [];
  static addValidator(func) {
    SimpleSchema._validators.push(func);
  }

  static _docValidators = [];
  static addDocValidator(func) {
    SimpleSchema._docValidators.push(func);
  }

  static ErrorTypes = {
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
    KEY_NOT_IN_SCHEMA: 'keyNotInSchema',
  };

  static Integer = 'SimpleSchema.Integer';

  // Backwards compatibility
  static _makeGeneric = MongoObject.makeKeyGeneric;
  static ValidationContext = ValidationContext;

  static setDefaultMessages = (messages) => {
    deepExtend(defaultMessages, messages);
  };
}

/*
 * PRIVATE
 */

function mergeSchemas(schemas) {
  const mergedSchema = {};
  _.each(schemas, schema => {
    // Loop through and extend each individual field
    // definition. That way you can extend and overwrite
    // base field definitions.
    _.each(schema, (def, field) => {
      mergedSchema[field] = mergedSchema[field] || {};
      if (!(mergedSchema[field] instanceof SimpleSchemaGroup)) {
        if (def instanceof SimpleSchemaGroup) {
          mergedSchema[field] = def;
        } else {
          Object.assign(mergedSchema[field], def);
        }
      }
    });
  });
  return mergedSchema;
}

// Throws an error if any fields are `type` SimpleSchema but then also
// have subfields defined outside of that.
function checkSchemaOverlap(schema) {
  _.each(schema, (val, key) => {
    if (!val.type) throw new Error(`${key} key is missing "type"`);
    _.each(val.type.definitions, (def) => {
      if (!(def.type instanceof SimpleSchema)) return;

      _.each(def.type._schema, (subVal, subKey) => {
        const newKey = `${key}.${subKey}`;
        if (schema.hasOwnProperty(newKey)) {
          throw new Error(`The type for "${key}" is set to a SimpleSchema instance that defines "${key}.${subKey}", but the parent SimpleSchema instance also tries to define "${key}.${subKey}"`);
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
  const pieces = fieldName.split('.');
  let label;
  do {
    label = pieces.pop();
  } while (label === '$' && pieces.length);
  return shouldHumanize ? humanize(label) : label;
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

function checkAndScrubDefinition(fieldName, definition, options, fullSchemaObj) {
  let internalDefinition = { ...definition };

  // Internally, all definition types are stored as groups for simplicity of access
  if (!(internalDefinition.type instanceof SimpleSchemaGroup)) {
    internalDefinition.type = new SimpleSchemaGroup(_.pick(internalDefinition, oneOfProps));
  }

  // Limit to only the non-oneOf props
  internalDefinition = _.omit(internalDefinition, _.without(oneOfProps, 'type'));

  // Validate the field definition
  _.each(internalDefinition, (val, key) => {
    if (schemaDefinitionOptions.indexOf(key) === -1) {
      throw new Error(`Invalid definition for ${fieldName} field: "${key}" is not a supported property`);
    }
  });

  // Make sure the `type`s are OK
  internalDefinition.type.definitions.forEach(({ blackbox, type }) => {
    if (!type) throw new Error(`Invalid definition for ${fieldName} field: "type" option is required`);

    if (Array.isArray(type)) {
      throw new Error(`Invalid definition for ${fieldName} field: "type" may not be an array. Change it to Array.`);
    }

    if (type instanceof SimpleSchema) {
      _.each(type._schema, (subVal, subKey) => {
        const newKey = `${fieldName}.${subKey}`;
        if (fullSchemaObj.hasOwnProperty(newKey)) {
          throw new Error(`The type for "${fieldName}" is set to a SimpleSchema instance that defines "${newKey}", but the parent SimpleSchema instance also tries to define "${newKey}"`);
        }
      });
    }

    // If any of the valid types are blackbox, mark blackbox on the overall definition
    if (blackbox === true) internalDefinition.blackbox = true;
  });

  // defaultValue -> autoValue
  // We support defaultValue shortcut by converting it immediately into an
  // autoValue.
  if ('defaultValue' in internalDefinition) {
    if ('autoValue' in internalDefinition) {
      console.warn(`SimpleSchema: Found both autoValue and defaultValue options for "${fieldName}". Ignoring defaultValue.`);
    } else {
      if (fieldName.endsWith('.$')) {
        throw new Error('An array item field (one that ends with ".$") cannot have defaultValue.');
      }
      internalDefinition.autoValue = getDefaultAutoValueFunction(internalDefinition.defaultValue);
      delete internalDefinition.defaultValue;
    }
  }

  // REQUIREDNESS
  if (fieldName.endsWith('.$')) {
    internalDefinition.optional = true;
  } else {
    if (!internalDefinition.hasOwnProperty('optional')) {
      if (internalDefinition.hasOwnProperty('required')) {
        if (typeof internalDefinition.required === 'function') {
          internalDefinition.optional = function optional(...args) {
            return !internalDefinition.required.apply(this, args);
          };
        } else {
          internalDefinition.optional = !internalDefinition.required;
        }
      } else {
        internalDefinition.optional = (options.requiredByDefault === false);
      }
    }
  }

  delete internalDefinition.required;

  // LABELS
  if (!internalDefinition.hasOwnProperty('label')) {
    if (options.defaultLabel) {
      internalDefinition.label = options.defaultLabel;
    } else if (SimpleSchema.defaultLabel) {
      internalDefinition.label = SimpleSchema.defaultLabel;
    } else {
      internalDefinition.label = inflectedLabel(fieldName, options.humanizeAutoLabels);
    }
  }

  return internalDefinition;
}

function getPickOrOmit(type) {
  return function pickOrOmit(...args) {
    // If they are picking/omitting an object or array field, we need to also include everything under it
    const newSchema = {};
    _.each(this._schema, (value, key) => {
      // Pick/omit it if it IS in the array of keys they want OR if it
      // STARTS WITH something that is in the array plus a period
      const includeIt = _.any(args, wantedField => key === wantedField || key.indexOf(`${wantedField}.`) === 0);

      if ((includeIt && type === 'pick') || (!includeIt && type === 'omit')) {
        newSchema[key] = value;
      }
    });

    return new SimpleSchema(newSchema);
  };
}

export { SimpleSchema, ValidationContext };
