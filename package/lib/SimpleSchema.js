import extend from 'extend';
import MongoObject from 'mongo-object';
import omit from 'lodash.omit';
import every from 'lodash.every';
import pick from 'lodash.pick';
import uniq from 'lodash.uniq';
import MessageBox from 'message-box';
import includes from 'lodash.includes';
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
  constructor(schema = {}, {
    check,
    clean: cleanOptions,
    defaultLabel,
    humanizeAutoLabels = true,
    requiredByDefault = true,
    tracker,
  } = {}) {
    // Stash the options object
    this._constructorOptions = {
      check,
      defaultLabel,
      humanizeAutoLabels,
      requiredByDefault,
      tracker,
    };

    // Custom validators for this instance
    this._validators = [];
    this._docValidators = [];

    // Named validation contexts
    this._validationContexts = {};

    // Schema-level defaults for cleaning
    this._cleanOptions = {
      filter: true,
      autoConvert: true,
      removeEmptyStrings: true,
      trimStrings: true,
      getAutoValues: true,
      removeNullsFromArrays: false,
      extendAutoValueContext: {},
      ...cleanOptions,
    };

    // Clone, expanding shorthand, and store the schema object in this._schema
    this._schema = {};
    this._depsLabels = {};
    this.extend(schema);

    // Define default validation error messages
    this.messageBox = new MessageBox(clone(defaultMessages));

    this.version = SimpleSchema.version;
  }

  forEachAncestorSimpleSchema(key, func) {
    const genericKey = MongoObject.makeKeyGeneric(key);

    forEachKeyAncestor(genericKey, (ancestor) => {
      const def = this._schema[ancestor];
      if (!def) return;
      def.type.definitions.forEach(typeDef => {
        if (SimpleSchema.isSimpleSchema(typeDef.type)) {
          func(typeDef.type, ancestor, genericKey.slice(ancestor.length + 1));
        }
      });
    });
  }

  /**
   * Returns whether the obj is a SimpleSchema object.
   * @param {Object} [obj] An object to test
   * @returns {Boolean} True if the given object appears to be a SimpleSchema instance
   */
  static isSimpleSchema(obj) {
    return (obj && (obj instanceof SimpleSchema || obj._schema));
  }

  /**
   * For Meteor apps, add a reactive dependency on the label
   * for a key.
   */
  reactiveLabelDependency(key, tracker = this._constructorOptions.tracker) {
    if (!key || !tracker) return;

    const genericKey = MongoObject.makeKeyGeneric(key);

    // If in this schema
    if (this._schema[genericKey]) {
      if (!this._depsLabels[genericKey]) {
        this._depsLabels[genericKey] = new tracker.Dependency();
      }
      this._depsLabels[genericKey].depend();
      return;
    }

    // If in subschema
    this.forEachAncestorSimpleSchema(key, (simpleSchema, ancestor, subSchemaKey) => {
      // Pass tracker down so that we get reactivity even if the subschema
      // didn't have tracker option set
      simpleSchema.reactiveLabelDependency(subSchemaKey, tracker);
    });
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
      let found = false;
      this.forEachAncestorSimpleSchema(key, (simpleSchema, ancestor, subSchemaKey) => {
        if (!found) keySchema = simpleSchema.schema(subSchemaKey);
        if (keySchema) found = true;
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

    this._schemaKeys.forEach((key) => {
      const keySchema = this._schema[key];
      mergedSchema[key] = keySchema;

      keySchema.type.definitions.forEach(typeDef => {
        if (!(SimpleSchema.isSimpleSchema(typeDef.type))) return;
        const childSchema = typeDef.type.mergedSchema();
        Object.keys(childSchema).forEach((subKey) => {
          mergedSchema[`${key}.${subKey}`] = childSchema[subKey];
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
  getDefinition(key, propList, functionContext = {}) {
    const defs = this.schema(key);
    if (!defs) return;

    const getPropIterator = (obj, newObj) => {
      return (prop) => {
        if (Array.isArray(propList) && !includes(propList, prop)) return;
        const val = obj[prop];
        // For any options that support specifying a function, evaluate the functions
        if (propsThatCanBeFunction.indexOf(prop) > -1 && typeof val === 'function') {
          newObj[prop] = val.call({
            key,
            ...functionContext,
          });
          // Inflect label if undefined
          if (prop === 'label' && typeof newObj[prop] !== 'string') newObj[prop] = inflectedLabel(key, this._constructorOptions.humanizeAutoLabels);
        } else {
          newObj[prop] = val;
        }
      };
    };

    const result = {};
    Object.keys(defs).forEach(getPropIterator(defs, result));

    // Resolve all the types and convert to a normal array to make it easier
    // to use.
    if (defs.type) {
      result.type = defs.type.definitions.map(typeDef => {
        const newTypeDef = {};
        Object.keys(typeDef).forEach(getPropIterator(typeDef, newTypeDef));
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
  getObjectSchema(key) {
    const newSchemaDef = {};
    const genericKey = MongoObject.makeKeyGeneric(key);
    const searchString = `${genericKey}.`;

    const mergedSchema = this.mergedSchema();
    Object.keys(mergedSchema).forEach((k) => {
      if (k.indexOf(searchString) === 0) {
        newSchemaDef[k.slice(searchString.length)] = mergedSchema[k];
      }
    });

    return this._copyWithSchema(newSchemaDef);
  }

  // Returns an array of all the autovalue functions, including those in subschemas all the
  // way down the schema tree
  autoValueFunctions() {
    let result = [].concat(this._autoValues);

    this._schemaKeys.forEach((key) => {
      this._schema[key].type.definitions.forEach(typeDef => {
        if (!(SimpleSchema.isSimpleSchema(typeDef.type))) return;
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
    this._schemaKeys.forEach((key) => {
      this._schema[key].type.definitions.forEach(typeDef => {
        if (!(SimpleSchema.isSimpleSchema(typeDef.type))) return;
        typeDef.type._blackboxKeys.forEach(blackboxKey => {
          blackboxKeys.push(`${key}.${blackboxKey}`);
        });
      });
    });
    return uniq(blackboxKeys);
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
            if (!(SimpleSchema.isSimpleSchema(typeDef.type))) return;
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
    return this._schemaKeys.some(loopKey => {
      // If the schema key is the test key, it's allowed.
      if (loopKey === key) return true;

      const fieldSchema = this.schema(loopKey);
      const compare1 = key.slice(0, loopKey.length + 2);
      const compare2 = compare1.slice(0, -1);

      // Blackbox and subschema checks are needed only if key starts with
      // loopKey + a dot
      if (compare2 !== `${loopKey}.`) return false;

      // Black box handling
      if (this._blackboxKeys.indexOf(loopKey) > -1) {
        // If the test key is the black box key + ".$", then the test
        // key is NOT allowed because black box keys are by definition
        // only for objects, and not for arrays.
        return compare1 !== `${loopKey}.$`;
      }

      // Subschemas
      let allowed = false;
      const subKey = key.slice(loopKey.length + 1);
      fieldSchema.type.definitions.forEach(typeDef => {
        if (!(SimpleSchema.isSimpleSchema(typeDef.type))) return;
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
   * Copies this schema into a new instance with the same validators, messages,
   * and options, but with different keys as defined in `schema` argument
   *
   * @param {Object} schema
   * @returns The new SimpleSchema instance (chainable)
   */
  _copyWithSchema(schema) {
    const cl = new SimpleSchema(schema, clone(this._constructorOptions, false, 1));
    cl._cleanOptions = this._cleanOptions;
    cl.messageBox = this.messageBox.clone();
    return cl;
  }

  /**
   * Clones this schema into a new instance with the same schema keys, validators,
   * and options.
   *
   * @returns The new SimpleSchema instance (chainable)
   */
  clone() {
    return this._copyWithSchema(this._schema);
  }

  /**
   * Extends (mutates) this schema with another schema, key by key.
   *
   * @param {SimpleSchema|Object} schema
   * @returns The SimpleSchema instance (chainable)
   */
  extend(schema = {}) {
    if (Array.isArray(schema)) throw new Error('You may not pass an array of schemas to the SimpleSchema constructor or to extend()');

    let schemaObj;
    if (SimpleSchema.isSimpleSchema(schema)) {
      schemaObj = schema._schema;
      this._validators = this._validators.concat(schema._validators);
      this._docValidators = this._docValidators.concat(schema._docValidators);
      this._cleanOptions = extend(false, this._cleanOptions, schema._cleanOptions);
      this._constructorOptions = extend(false, this._constructorOptions, schema._constructorOptions);
    } else {
      schemaObj = expandShorthand(schema);
    }

    // Update all of the information cached on the instance
    Object.keys(schemaObj).forEach((fieldName) => {
      const definition = standardizeDefinition(schemaObj[fieldName]);

      // Merge/extend with any existing definition
      if (this._schema[fieldName]) {
        if (!this._schema.hasOwnProperty(fieldName)) {
          // fieldName is actually a method from Object itself!
          throw new Error(`${fieldName} key is actually the name of a method on Object, please rename it`);
        }
        this._schema[fieldName] = {
          ...this._schema[fieldName],
          ...(omit(definition, 'type')),
        };
        if (definition.type) this._schema[fieldName].type.extend(definition.type);
      } else {
        this._schema[fieldName] = definition;
      }

      checkAndScrubDefinition(fieldName, this._schema[fieldName], this._constructorOptions, schemaObj);
    });

    checkSchemaOverlap(this._schema);

    // Set/Reset all of these
    this._schemaKeys = Object.keys(this._schema);
    this._autoValues = [];
    this._blackboxKeys = [];
    this._firstLevelSchemaKeys = [];
    this._objectKeys = {};

    // Update all of the information cached on the instance
    this._schemaKeys.forEach((fieldName) => {
      // Make sure parent has a definition in the schema. No implied objects!
      if (fieldName.indexOf('.') > -1) {
        const parentFieldName = fieldName.slice(0, fieldName.lastIndexOf('.'));
        if (!this._schema.hasOwnProperty(parentFieldName)) throw new Error(`"${fieldName}" is in the schema but "${parentFieldName}" is not`);
      }

      const definition = this._schema[fieldName];

      // Keep list of all top level keys
      if (fieldName.indexOf('.') === -1) this._firstLevelSchemaKeys.push(fieldName);

      // Keep list of all blackbox keys for passing to MongoObject constructor
      // XXX For now if any oneOf type is blackbox, then the whole field is.
      every(definition.type.definitions, (oneOfDef) => {
        if (oneOfDef.blackbox === true) {
          this._blackboxKeys.push(fieldName);
          return false; // exit loop
        }
        return true;
      });

      // Keep list of autoValue functions
      if (typeof definition.autoValue === 'function') {
        this._autoValues.push({
          closestSubschemaFieldName: '',
          fieldName,
          func: definition.autoValue,
        });
      }
    });

    // Store child keys keyed by parent. This needs to be done recursively to handle
    // subschemas.
    const setObjectKeys = (curSchema, schemaParentKey) => {
      Object.keys(curSchema).forEach((fieldName) => {
        const definition = curSchema[fieldName];
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
          if (SimpleSchema.isSimpleSchema(type)) {
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

    return [...this.get(key, 'allowedValues')];
  }

  newContext() {
    return new ValidationContext(this);
  }

  namedContext(name) {
    if (typeof name !== 'string') name = 'default';
    if (!this._validationContexts[name]) {
      this._validationContexts[name] = new ValidationContext(this);
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
  validate(obj, options = {}) {
    // For Meteor apps, `check` option can be passed to silence audit-argument-checks
    const check = options.check || this._constructorOptions.check;
    if (typeof check === 'function') {
      // Call check but ignore the error
      try { check(obj); } catch (e) { /* ignore error */ }
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
      error.error = 'validation-error';

      // Add meaningful error messages for each validation error.
      // Useful for display messages when using 'mdg:validated-method'.
      error.details = errors.map(errorDetail => ({ ...errorDetail, message: this.messageForError(errorDetail) }));

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

  /**
   * @param obj {Object} Object to validate.
   * @param [options] {Object} Same options object that ValidationContext#validate takes
   *
   * Returns a Promise that resolves with the errors
   */
  validateAndReturnErrorsPromise(obj, options) {
    const validationContext = this.newContext();
    const isValid = validationContext.validate(obj, options);

    if (isValid) return Promise.resolve([]);

    // Add the `message` prop
    const errors = validationContext.validationErrors().map((errorDetail) => {
      return { ...errorDetail, message: this.messageForError(errorDetail) };
    });

    return Promise.resolve(errors);
  }

  validator(options = {}) {
    return (obj) => {
      const optionsClone = { ...options };
      if (options.clean === true) {
        // Do this here and pass into both functions for better performance
        optionsClone.mongoObject = new MongoObject(obj, this.blackboxKeys());
        this.clean(obj, optionsClone);
      }
      if (options.returnErrorsPromise) {
        return this.validateAndReturnErrorsPromise(obj, optionsClone);
      }
      return this.validate(obj, optionsClone);
    };
  }

  getFormValidator(options = {}) {
    return this.validator({ ...options, returnErrorsPromise: true });
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
    Object.keys(labels).forEach((key) => {
      const label = labels[key];
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
      this._schemaKeys.forEach((schemaKey) => {
        result[schemaKey] = this.label(schemaKey);
      });
      return result;
    }

    // Get label for one field
    const label = this.get(key, 'label');
    if (label) this.reactiveLabelDependency(key);
    return label || null;
  }

  /**
   * Gets a field's property
   *
   * @param {String} key The schema key, specific or generic.
   * @param {String} prop Name of the property to get for that schema key
   * @param {Object} [functionContext] The `this` context to use if prop is a function
   * @returns {any} The property value
   */
  get(key, prop, functionContext) {
    const def = this.getDefinition(key, ['type', prop], functionContext);

    if (!def) return undefined;

    if (includes(schemaDefinitionOptions, prop)) {
      return def[prop];
    }

    return (def.type.find(props => props[prop]) || {})[prop];
  }

  // shorthand for getting defaultValue
  defaultValue(key) {
    return this.get(key, 'defaultValue');
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
    if (!(SimpleSchema.isSimpleSchema(schema))) {
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
    extend(true, defaultMessages, messages);
  };
}

/*
 * PRIVATE
 */

// Throws an error if any fields are `type` SimpleSchema but then also
// have subfields defined outside of that.
function checkSchemaOverlap(schema) {
  Object.keys(schema).forEach((key) => {
    const val = schema[key];
    if (!val.type) throw new Error(`${key} key is missing "type"`);
    val.type.definitions.forEach((def) => {
      if (!(SimpleSchema.isSimpleSchema(def.type))) return;

      Object.keys(def.type._schema).forEach((subKey) => {
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

    // Handle the case when pulling an object from an array the object contains a field
    // which has a defaultValue. We don't wan't the default value to be returned in this case
    if (this.operator === '$pull' || this.isUpdate) return;

    // Handle the case where we are $pushing an object into an array of objects and we
    // want any fields missing from that object to be added if they have default values
    if (this.operator === '$push') return defaultValue;

    // If parent is set, we should update this position instead of $setOnInsert
    if (this.parentField().isSet) return defaultValue;

    // We don't know whether it's an upsert, but if it's not, this seems to be ignored,
    // so this is a safe way to make sure the default value is added on upsert insert.
    return { $setOnInsert: defaultValue };
  };
}

// Mutates def into standardized object with SimpleSchemaGroup type
function standardizeDefinition(def) {
  const standardizedDef = omit(def, oneOfProps);

  // Internally, all definition types are stored as groups for simplicity of access.
  // If we are extending, there may not actually be def.type, but it's okay because
  // it will be added later when the two SimpleSchemaGroups are merged.
  if (def.type && def.type instanceof SimpleSchemaGroup) {
    standardizedDef.type = def.type.clone();
  } else {
    const groupProps = pick(def, oneOfProps);
    standardizedDef.type = new SimpleSchemaGroup(groupProps);
  }

  return standardizedDef;
}

// Checks and mutates definition. Clone it first.
function checkAndScrubDefinition(fieldName, definition, options, fullSchemaObj) {
  if (!definition.type) throw new Error(`${fieldName} key is missing "type"`);

  // Validate the field definition
  Object.keys(definition).forEach((key) => {
    if (schemaDefinitionOptions.indexOf(key) === -1) {
      throw new Error(`Invalid definition for ${fieldName} field: "${key}" is not a supported property`);
    }
  });

  // Make sure the `type`s are OK
  let couldBeArray = false;
  definition.type.definitions.forEach(({ type }) => {
    if (!type) throw new Error(`Invalid definition for ${fieldName} field: "type" option is required`);

    if (Array.isArray(type)) {
      throw new Error(`Invalid definition for ${fieldName} field: "type" may not be an array. Change it to Array.`);
    }

    if (type === Array) couldBeArray = true;

    if (SimpleSchema.isSimpleSchema(type)) {
      Object.keys(type._schema).forEach((subKey) => {
        const newKey = `${fieldName}.${subKey}`;
        if (fullSchemaObj.hasOwnProperty(newKey)) {
          throw new Error(`The type for "${fieldName}" is set to a SimpleSchema instance that defines "${newKey}", but the parent SimpleSchema instance also tries to define "${newKey}"`);
        }
      });
    }
  });

  // If at least one of the possible types is Array, then make sure we have a
  // definition for the array items, too.
  if (couldBeArray && !fullSchemaObj.hasOwnProperty(`${fieldName}.$`)) {
    throw new Error(`"${fieldName}" is Array type but the schema does not include a "${fieldName}.$" definition for the array items"`);
  }

  // defaultValue -> autoValue
  // We support defaultValue shortcut by converting it immediately into an
  // autoValue.

  if ('defaultValue' in definition) {
    if ('autoValue' in definition && !definition.autoValue.isDefault) {
      console.warn(`SimpleSchema: Found both autoValue and defaultValue options for "${fieldName}". Ignoring defaultValue.`);
    } else {
      if (fieldName.endsWith('.$')) {
        throw new Error('An array item field (one that ends with ".$") cannot have defaultValue.');
      }
      definition.autoValue = getDefaultAutoValueFunction(definition.defaultValue);
      definition.autoValue.isDefault = true;
    }
  }

  // REQUIREDNESS
  if (fieldName.endsWith('.$')) {
    definition.optional = true;
  } else {
    if (!definition.hasOwnProperty('optional')) {
      if (definition.hasOwnProperty('required')) {
        if (typeof definition.required === 'function') {
          definition.optional = function optional(...args) {
            return !definition.required.apply(this, args);
          };
        } else {
          definition.optional = !definition.required;
        }
      } else {
        definition.optional = (options.requiredByDefault === false);
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
  return function pickOrOmit(...args) {
    // If they are picking/omitting an object or array field, we need to also include everything under it
    const newSchema = {};
    this._schemaKeys.forEach((key) => {
      // Pick/omit it if it IS in the array of keys they want OR if it
      // STARTS WITH something that is in the array plus a period
      const includeIt = args.some(wantedField => key === wantedField || key.indexOf(`${wantedField}.`) === 0);

      if ((includeIt && type === 'pick') || (!includeIt && type === 'omit')) {
        newSchema[key] = this._schema[key];
      }
    });

    return this._copyWithSchema(newSchema);
  };
}

export { SimpleSchema, ValidationContext };
