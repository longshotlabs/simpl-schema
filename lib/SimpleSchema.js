import MongoObject from 'mongo-object';
import humanize from './humanize.js';
import ValidationContext from './ValidationContext';
import SimpleSchemaGroup from './SimpleSchemaGroup';
import regExpObj from './regExp';
import _ from 'underscore';
import MessageBox from 'message-box';
import clean from './clean';

// Exported for tests
export const schemaDefinitionOptions = [
  'type',
  'label',
  'optional',
  'required',
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
  'autoValue',
  'defaultValue',
  'tracker',
  'trim',
  'humanizeAutoLabels',
];

const optionsThatCanBeFunction = [
  'label',
  'optional',
  'min',
  'max',
  'minCount',
  'maxCount',
  'allowedValues',
];

const regExpMessages = [
  { exp: regExpObj.Email, msg: 'must be a valid email address' },
  { exp: regExpObj.WeakEmail, msg: 'must be a valid email address' },
  { exp: regExpObj.Domain, msg: 'must be a valid domain' },
  { exp: regExpObj.WeakDomain, msg: 'must be a valid domain' },
  { exp: regExpObj.IP, msg: 'must be a valid IPv4 or IPv6 address' },
  { exp: regExpObj.IPv4, msg: 'must be a valid IPv4 address' },
  { exp: regExpObj.IPv6, msg: 'must be a valid IPv6 address' },
  { exp: regExpObj.Url, msg: 'must be a valid URL' },
  { exp: regExpObj.Id, msg: 'must be a valid alphanumeric ID' },
];

class SimpleSchema {
  constructor(schemas, options) {
    options = options || {};
    schemas = schemas || {};

    if (options.humanizeAutoLabels !== false) options.humanizeAutoLabels = true;

    if (!Array.isArray(schemas)) schemas = [schemas];

    // adjust and store a copy of the schema definitions
    this._schema = mergeSchemas(schemas);

    // store the list of defined keys for speedier checking
    this._schemaKeys = [];

    // store autoValue functions by key
    this._autoValues = {};

    // store the list of blackbox keys for passing to MongoObject constructor
    this._blackboxKeys = [];

    // store the list of first level keys
    this._firstLevelSchemaKeys = [];

    // a place to store custom validators for this instance
    this._validators = [];

    this._depsLabels = {};

    _.each(this._schema, (definition, fieldName) => {
      if (definition instanceof SimpleSchemaGroup) {
        definition.definitions = definition.definitions.map(def => checkAndScrubDefinition(fieldName, def, options));
      } else {
        definition = checkAndScrubDefinition(fieldName, definition, options);
      }

      this._schema[fieldName] = definition;

      // Keep list of all keys
      this._schemaKeys.push(fieldName);

      // Keep list of all top level keys
      if (fieldName.indexOf('.') === -1) this._firstLevelSchemaKeys.push(fieldName);

      // Initialize label reactive dependency
      if (options.tracker) {
        this._depsLabels[fieldName] = new options.tracker.Dependency();
      }

      // Keep list of all blackbox keys
      if (definition.blackbox === true) this._blackboxKeys.push(fieldName);

      // Keep list of autoValue functions
      if (definition.autoValue) this._autoValues[fieldName] = definition.autoValue;

      // Check array items
      if (definition.type === Array) {
        if (!this._schema[`${fieldName}.$`]) throw new Error(`Missing definition for key ${fieldName}.$`);
        // Set array item label to same as array label if array item label is missing
        if (!this._schema[`${fieldName}.$`].hasOwnProperty('label')) {
          this._schema[`${fieldName}.$`].label = this._schema[fieldName].label;
          if (options.tracker) {
            this._depsLabels[`${fieldName}.$`] = new options.tracker.Dependency();
          }
        }
      }
    });

    // Store a list of all object keys
    this._objectKeys = getObjectKeys(this._schema, this._schemaKeys);

    // We will store named validation contexts here
    this._validationContexts = {};

    this._constructorOptions = options;

    this.messageBox = new MessageBox({
      initialLanguage: 'en',
      messages: {
        en: {
          required: '{{label}} is required',
          minString: '{{label}} must be at least {{min}} characters',
          maxString: '{{label}} cannot exceed {{max}} characters',
          minNumber: '{{label}} must be at least {{min}}',
          maxNumber: '{{label}} cannot exceed {{max}}',
          minNumberExclusive: '{{label}} must be greater than {{min}}',
          maxNumberExclusive: '{{label}} must be less than {{max}}',
          minDate: '{{label}} must be on or after {{min}}',
          maxDate: '{{label}} cannot be after {{max}}',
          badDate: '{{label}} is not a valid date',
          minCount: 'You must specify at least {{minCount}} values',
          maxCount: 'You cannot specify more than {{maxCount}} values',
          noDecimal: '{{label}} must be an integer',
          notAllowed: '{{value}} is not an allowed value',
          expectedType: '{{label}} must be of type {{dataType}}',
          regEx({
            label,
            regExp,
          }) {
            // See if there's one where exp matches this expression
            let msgObj;
            if (regExp) {
              msgObj = _.find(regExpMessages, (o) => o.exp && o.exp.toString() === regExp);
            }

            const regExpMessage = msgObj ? msgObj.msg : 'failed regular expression validation';

            return `${label} ${regExpMessage}`;
          },
          keyNotInSchema: '{{name}} is not allowed by the schema',
        },
      },
    });

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
  }

  /**
   * @param {String} [key] One specific or generic key for which to get the schema
   * @returns {Object} The entire schema object or just the definition for one key
   */
  schema(key) {
    return key ? this._schema[MongoObject.makeKeyGeneric(key)] : this._schema;
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
    let defs = this.schema(key);
    if (!defs) return;
    defs = Array.isArray(propList) ? _.pick(defs, propList) : _.clone(defs);

    // Clone any, for any options that support specifying a function, evaluate the functions.
    const result = {};
    _.each(defs, (val, prop) => {
      result[prop] = val;
      if (optionsThatCanBeFunction.indexOf(prop) > -1 && typeof result[prop] === 'function') {
        result[prop] = result[prop].call(functionContext || {});
        // Inflect label if undefined
        if (prop === 'label' && typeof result[prop] !== 'string') result[prop] = inflectedLabel(key, this._constructorOptions.humanizeAutoLabels);
      }
    });
    return result;
  }

  // Check if the key is a nested dot-syntax key inside of a blackbox object
  keyIsInBlackBox(key) {
    let testKey = MongoObject.makeKeyGeneric(key);
    let lastDot;

    // Iterate the dot-syntax hierarchy until we find a key in our schema
    do {
      lastDot = testKey.lastIndexOf('.');
      if (lastDot !== -1) {
        testKey = testKey.slice(0, lastDot); // Remove last path component
        if (this._blackboxKeys.indexOf(testKey) > -1) return true;
      }
    } while (lastDot !== -1);

    return false;
  }

  // Returns true if key is explicitly allowed by the schema or implied
  // by other explicitly allowed keys.
  // The key string should have $ in place of any numeric array positions.
  allowsKey(key) {
    // Loop through all keys in the schema
    return _.any(this._schemaKeys, (schemaKey) => {
      // If the schema key is the test key, it's allowed.
      if (schemaKey === key) return true;

      // Black box handling
      if (this.schema(schemaKey).blackbox === true) {
        const kl = schemaKey.length;
        const compare1 = key.slice(0, kl + 2);
        const compare2 = compare1.slice(0, -1);

        // If the test key is the black box key + ".$", then the test
        // key is NOT allowed because black box keys are by definition
        // only for objects, and not for arrays.
        if (compare1 === `${schemaKey}.$`) return false;

        // Otherwise
        if (compare2 === `${schemaKey}.`) return true;
      }

      return false;
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
    return keyPrefix ? (this._objectKeys[`${keyPrefix}.`] || []) : this._firstLevelSchemaKeys;
  }

  /**
   * Extends this schema with another schema, key by key.
   *
   * @param {SimpleSchema} schema
   * @returns {SimpleSchema} The new, extended schema.
   */
  extend(schema) {
    return new SimpleSchema([this, schema]);
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

  validate(obj, options) {
    // For Meteor apps, `check` option can be passed to silence audit-argument-checks
    if (typeof this._constructorOptions.check === 'function') {
      // Call check but ignore the error
      try { this._constructorOptions.check(obj); } catch (e) { /* ignore error */ }
    }

    const validationContext = this.newContext();
    const isValid = validationContext.validate(obj, options);

    if (isValid) return;

    const errors = validationContext.validationErrors();

    // In order for the message at the top of the stack trace to be useful,
    // we set it to the first validation error message.
    const message = this.messageForError(errors[0]);

    const error = new Error(message);
    error.name = error.errorType = 'ClientError';
    error.details = errors;
    error.error = 'validation-error';
    throw error;
  }

  validator(options = {}) {
    return (obj) => {
      if (options.clean === true) this.clean(obj, options);
      this.validate(obj, options);
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

  // If you need to allow properties other than those listed above, call this from your app or package
  static extendOptions(options) {
    // For backwards compatibility we still take an object here, but we only care about the names
    if (!Array.isArray(options)) options = Object.keys(options);
    options.forEach(option => {
      schemaDefinitionOptions.push(option);
    });
  }

  static validate(obj, schema, options) {
    // Allow passing just the schema object
    if (!(schema instanceof SimpleSchema)) {
      schema = new SimpleSchema(schema);
    }

    return schema.validate(obj, options);
  }

  static oneOf(definitions) {
    return new SimpleSchemaGroup(definitions);
  }

  static RegEx = regExpObj;

  // Global custom validators
  static _validators = [];
  static addValidator(func) {
    SimpleSchema._validators.push(func);
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
}

/*
 * PRIVATE
 */

function mergeSchemas(schemas) {
  // Merge all provided schema definitions.
  // This is effectively a shallow clone of each object, too,
  // which is what we want since we are going to manipulate it.
  const mergedSchema = {};
  _.each(schemas, schema => {
    // Create a temporary SS instance so that the internal object
    // we use for merging/extending will be fully expanded
    if (schema instanceof SimpleSchema) {
      schema = schema._schema;
    } else {
      schema = expandSchema(schema);
    }

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

// Returns an object relating the keys in the list
// to their parent object.
function getObjectKeys(schema, schemaKeyList) {
  const result = {};

  _.each(schema, (definition, key) => {
    if (definition.type !== Object) return;

    const keyPrefix = `${key}.`;
    const childKeys = [];
    _.each(schemaKeyList, otherKey => {
      // Is it a descendant key?
      if (!otherKey.startsWith(keyPrefix)) return;
      const remainingText = otherKey.substring(keyPrefix.length);
      // Is it a direct child?
      if (remainingText.indexOf('.') === -1) childKeys.push(remainingText);
    });
    result[keyPrefix] = childKeys;
  });

  return result;
}

function expandSchema(schema) {
  // BEGIN SHORTHAND
  const addArrayFields = [];
  _.each(schema, (definition, key) => {
    if (!MongoObject.isBasicObject(definition) && !(definition instanceof SimpleSchemaGroup)) {
      if (Array.isArray(definition)) {
        if (Array.isArray(definition[0])) {
          throw new Error(`Array shorthand may only be used to one level of depth (${key})`);
        }
        const type = definition[0];
        if (type instanceof RegExp) {
          addArrayFields.push({ key, type: String, regEx: type });
        } else {
          addArrayFields.push({ key, type });
        }
        schema[key] = { type: Array };
      } else {
        if (definition instanceof RegExp) {
          schema[key] = {
            type: String,
            regEx: definition,
          };
        } else {
          schema[key] = { type: definition };
        }
      }
    }
  });

  for (const { key, type, regEx } of addArrayFields) {
    const itemKey = `${key}.$`;
    if (schema[itemKey]) {
      throw new Error(`Array shorthand used for ${key} field but ${key}.$ key is already in the schema`);
    }
    schema[itemKey] = { type };
    if (regEx) schema[itemKey].regEx = regEx;
  }
  // END SHORTHAND

  // Flatten schema by inserting nested definitions
  _.each(schema, (val, key) => {
    if (!(val.type instanceof SimpleSchema)) return;

    // Add child schema definitions to parent schema
    _.each(val.type._schema, (subVal, subKey) => {
      const newKey = `${key}.${subKey}`;
      if (!schema.hasOwnProperty(newKey)) schema[newKey] = subVal;
    });

    val.type = Object;
  });
  return schema;
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

function checkAndScrubDefinition(fieldName, definition, options) {
  // Validate the field definition
  _.each(definition, (val, key) => {
    if (schemaDefinitionOptions.indexOf(key) === -1) {
      throw new Error(`Invalid definition for ${fieldName} field: "${key}" is not a supported option`);
    }
  });

  // TYPE
  // Since type can be anything, make sure it's defined
  if (!definition.type) throw new Error(`Invalid definition for ${fieldName} field: "type" option is required`);

  if (Array.isArray(definition.type)) {
    throw new Error(`Invalid definition for ${fieldName} field: "type" may not be an array. Change it to Array.`);
  }

  const internalDefinition = { ...definition };

  // AUTOVALUE

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
