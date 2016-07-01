import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';
import testSchema from './testHelpers/testSchema';
import expectValid from './testHelpers/expectValid';
import expectErrorOfTypeLength from './testHelpers/expectErrorOfTypeLength';

describe('SimpleSchema', function () {
  describe('nesting', function () {
    it('works', function () {
      const childDef = {
        type: String,
        min: 10,
        label: 'foo',
        optional: false,
      };

      const parentDef = {
        type: SimpleSchema.Integer,
        min: 10,
        label: 'foo',
        optional: false,
      };

      const child = new SimpleSchema({
        copied: childDef,
        overridden: childDef,
      });

      const parent = new SimpleSchema({
        value: {
          type: child,
        },
        array: {
          type: Array,
        },
        'array.$': {
          type: child,
        },
        'value.overridden': parentDef,
        'array.$.overridden': parentDef,
      });

      const defs = parent._schema;

      // should change parent definition types to Object
      expect(defs.value.type).toEqual(Object);

      // should add child definitions to parent schema
      expect(defs['value.copied']).toEqual(childDef);

      // parent definitions should override child definitions
      expect(defs['value.overridden']).toEqual(parentDef);

      // should change array parent definition types to Array
      expect(defs.array.type).toEqual(Array);

      // should add array child definitions to parent schema
      expect(defs['array.$'].type).toEqual(Object);

      // should add array child definitions to parent schema
      expect(defs['array.$.copied']).toEqual(childDef);

      // parent definitions should override array child definitions
      expect(defs['array.$.overridden']).toEqual(parentDef);
    });
  });

  describe('Basic Schema Merge', function () {
    it('works', function () {
      const schema = new SimpleSchema([{
        a: {
          type: Boolean,
          label: 'foo',
          optional: false
        },
        b: {
          type: String,
          label: 'foo',
          optional: false
        }
      }, {
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      }]);

      expect(schema._schema).toEqual({
        a: {
          type: Boolean,
          label: 'foo',
          optional: false
        },
        b: {
          type: String,
          label: 'foo',
          optional: false
        },
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      });
    });
  });

  describe('Mixed Schema Merge', function () {
    it('works', function () {
      const schema1 = new SimpleSchema({
        a: {
          type: Boolean,
          label: 'foo',
          optional: false
        },
        b: {
          type: Array,
          label: 'foo',
          optional: false
        },
        'b.$': {
          type: String,
          label: 'foo',
        }
      });

      const schema2 = new SimpleSchema([schema1, {
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      }]);

      expect(schema2._schema).toEqual({
        a: {
          type: Boolean,
          label: 'foo',
          optional: false
        },
        b: {
          type: Array,
          label: 'foo',
          optional: false
        },
        'b.$': {
          type: String,
          optional: true,
          label: 'foo'
        },
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      });
    });
  });

  describe('Mixed Schema Merge With Base Extend and Override', function () {
    it('works', function () {
      const schema1 = new SimpleSchema({
        a: {
          type: Boolean,
          label: 'foo',
          optional: false
        },
        b: {
          type: Array,
          label: 'foo',
          optional: false
        },
        'b.$': {
          type: String,
          label: 'foo',
        }
      });

      const schema2 = new SimpleSchema([schema1, {
        a: {
          type: SimpleSchema.Integer,
          label: 'foo',
          optional: false
        },
        b: {
          label: 'Bacon',
          optional: false
        },
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      }]);

      expect(schema2._schema).toEqual({
        a: {
          type: SimpleSchema.Integer,
          label: 'foo',
          optional: false
        },
        b: {
          type: Array,
          label: 'Bacon',
          optional: false
        },
        'b.$': {
          type: String,
          optional: true,
          label: 'foo'
        },
        c: {
          type: String,
          label: 'foo',
          optional: false
        },
        d: {
          type: String,
          label: 'foo',
          optional: false
        }
      });
    });
  });

  it('Issue #123', function () {
    // With $set
    const userSchema = new SimpleSchema({
      'profile': {
        type: Object
      },
      'profile.name': {
        type: String
      }
    });

    const context = userSchema.namedContext();

    expect(context.validate({
      $set: {
        'profile': {}
      }
    }, { modifier: true })).toEqual(false);

    // With $push
    const userSchema2 = new SimpleSchema({
      'profile': {
        type: Array
      },
      'profile.$': {
        type: Object
      },
      'profile.$.name': {
        type: String
      }
    });

    const context2 = userSchema2.namedContext();

    expect(context2.validate({
      $push: {
        'profile': {}
      }
    }, { modifier: true })).toEqual(false);
  });

  it('validate object with prototype', function () {
    const schema = new SimpleSchema({
      foo: { type: SimpleSchema.Integer }
    });

    const CustObj = function (o) {
      Object.assign(this, o);
    };
    CustObj.prototype.bar = function () {
      return 20;
    };

    const testObj = new CustObj({ foo: 1 });

    const context = schema.namedContext();
    expect(context.validate(testObj)).toBe(true);
    expect(testObj instanceof CustObj).toBe(true);
  });

  it('allowsKey', function () {
    function run(key, allowed) {
      expect(testSchema.allowsKey(key)).toEqual(allowed);
    }

    run('minMaxString', true);
    run('minMaxString.$', false);
    run('minMaxString.$.foo', false);
    run('minMaxString.$foo', false);
    run('minMaxString.foo', false);
    run('sub', true);
    run('sub.number', true);
    run('sub.number.$', false);
    run('sub.number.$.foo', false);
    run('sub.number.$foo', false);
    run('sub.number.foo', false);
    run('minMaxStringArray', true);
    run('minMaxStringArray.$', true);
    run('minMaxStringArray.$.foo', false);
    run('minMaxStringArray.foo', false);
    run('customObject', true);
    run('customObject.$', false);
    run('customObject.foo', true);
    run('customObject.foo.$', true);
    run('customObject.foo.$foo', true);
    run('customObject.foo.$.$foo', true);
    run('blackBoxObject', true);
    run('blackBoxObject.$', false);
    run('blackBoxObject.foo', true);
    run('blackBoxObject.foo.$', true);
    run('blackBoxObject.foo.$foo', true);
    run('blackBoxObject.foo.$.$foo', true);
    run('blackBoxObject.foo.bar.$.baz', true);
  });

  it('extend', function () {
    const schema1 = new SimpleSchema({
      firstName: {
        type: String,
        label: 'First name',
        optional: false
      },
      lastName: {
        type: String,
        label: 'Last name',
        optional: false
      }
    });

    const schema2 = schema1.extend({
      firstName: {
        optional: true
      }
    });

    expect(schema2.schema()).toEqual({
      firstName: {
        type: String,
        label: 'First name',
        optional: true
      },
      lastName: {
        type: String,
        label: 'Last name',
        optional: false
      }
    });
  });

  it('empty required array is valid', function () {
    const schema = new SimpleSchema({
      names: { type: Array },
      'names.$': { type: String },
    });

    expectValid(schema, {
      names: [],
    });
  });

  it('null in array is not valid', function () {
    const schema = new SimpleSchema({
      names: { type: Array },
      'names.$': { type: String },
    });

    expectErrorOfTypeLength(SimpleSchema.ErrorTypes.EXPECTED_TYPE, schema, {
      names: [null],
    });
  });

  it('null is valid for optional', function () {
    const schema = new SimpleSchema({
      test: { type: String, optional: true },
    });

    expectValid(schema, {
      test: null,
    });
  });

  it('issue 360', function () {
    const schema = new SimpleSchema({
      emails: {
        type: Array,
      },
      'emails.$': {
        type: Object,
      },
      'emails.$.address': {
        type: String,
        regEx: SimpleSchema.RegEx.Email,
      },
      'emails.$.verified': {
        type: Boolean,
      },
    });

    expectErrorOfTypeLength(SimpleSchema.ErrorTypes.EXPECTED_TYPE, schema, {
      emails: [
        {
          address: 12321,
          verified: 'asdasd',
        },
      ],
    }, { keys: ['emails'] }).toEqual(2);

    expectErrorOfTypeLength(SimpleSchema.ErrorTypes.EXPECTED_TYPE, schema, {
      emails: [
        {
          address: 12321,
          verified: 'asdasd',
        },
      ],
    }, { keys: ['emails.0'] }).toEqual(2);
  });

  it('ignore option', function () {
    const schema = new SimpleSchema({
      foo: { type: String, optional: true },
    });

    expectValid(schema, {
      foo: 'bar',
    });

    expectValid(schema, {
      foo: 'bar',
    }, {
      ignore: [SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA],
    });

    expectValid(schema, {
      foo: 'bar',
    }, {
      keys: ['foo'],
      ignore: [SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA],
    });

    expectErrorOfTypeLength(SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA, schema, {
      bar: 'foo',
    });

    expectValid(schema, {
      bar: 'foo',
    }, {
      ignore: [SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA],
    });

    expectValid(schema, {
      bar: 'foo',
    }, {
      keys: ['bar'],
      ignore: [SimpleSchema.ErrorTypes.KEY_NOT_IN_SCHEMA],
    });
  });

  it('ValidationError', function () {
    const schema = new SimpleSchema({
      int: SimpleSchema.Integer,
      string: String,
    });

    function verify(error) {
      expect(error.name).toEqual('ClientError');
      expect(error.errorType).toEqual('ClientError');
      expect(error.error).toEqual('validation-error');
      expect(error.details.length).toEqual(2);
      expect(error.details[0].name).toEqual('int');
      expect(error.details[0].type).toEqual(SimpleSchema.ErrorTypes.EXPECTED_TYPE);
      expect(error.details[1].name).toEqual('string');
      expect(error.details[1].type).toEqual(SimpleSchema.ErrorTypes.REQUIRED);

      // In order for the message at the top of the stack trace to be useful,
      // we set it to the first validation error message.
      expect(error.reason, 'Int must be of type Integer');
      expect(error.message, 'Int must be of type Integer [validation-error]');
    }

    try {
      schema.validate({ int: '5' });
    } catch (error) {
      verify(error);
    }

    try {
      SimpleSchema.validate({ int: '5' }, schema);
    } catch (error) {
      verify(error);
    }

    try {
      SimpleSchema.validate({ int: '5' }, {
        int: SimpleSchema.Integer,
        string: String,
      });
    } catch (error) {
      verify(error);
    }

    try {
      schema.validator()({ int: '5' });
    } catch (error) {
      verify(error);
    }

    expect(function () {
      schema.validator({ clean: true })({ int: '5', string: 'test' });
    }).toNotThrow();
  });
});
