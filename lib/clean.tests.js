/* eslint-disable func-names, prefer-arrow-callback */

import expect from 'expect';
import { SimpleSchema } from './SimpleSchema';
import Address from './testHelpers/Address';

const ss = new SimpleSchema({
  string: {
    type: String,
    optional: true,
  },
  minMaxString: {
    type: String,
    optional: true,
    min: 10,
    max: 20,
    regEx: /^[a-z0-9_]+$/,
  },
  minMaxStringArray: {
    type: Array,
    optional: true,
    minCount: 1,
    maxCount: 2,
  },
  'minMaxStringArray.$': {
    type: String,
    min: 10,
    max: 20,
  },
  allowedStrings: {
    type: String,
    optional: true,
    allowedValues: ['tuna', 'fish', 'salad'],
  },
  allowedStringsArray: {
    type: Array,
    optional: true,
  },
  'allowedStringsArray.$': {
    type: String,
    allowedValues: ['tuna', 'fish', 'salad'],
  },
  boolean: {
    type: Boolean,
    optional: true,
  },
  booleanArray: {
    type: Array,
    optional: true,
  },
  'booleanArray.$': {
    type: Boolean,
  },
  number: {
    type: SimpleSchema.Integer,
    optional: true,
  },
  sub: {
    type: Object,
    optional: true,
  },
  'sub.number': {
    type: SimpleSchema.Integer,
    optional: true,
  },
  minMaxNumber: {
    type: SimpleSchema.Integer,
    optional: true,
    min: 10,
    max: 20,
  },
  minZero: {
    type: SimpleSchema.Integer,
    optional: true,
    min: 0,
  },
  maxZero: {
    type: SimpleSchema.Integer,
    optional: true,
    max: 0,
  },
  minMaxNumberCalculated: {
    type: SimpleSchema.Integer,
    optional: true,
    min() {
      return 10;
    },
    max() {
      return 20;
    },
  },
  minMaxNumberExclusive: {
    type: SimpleSchema.Integer,
    optional: true,
    min: 10,
    max: 20,
    exclusiveMax: true,
    exclusiveMin: true,
  },
  minMaxNumberInclusive: {
    type: SimpleSchema.Integer,
    optional: true,
    min: 10,
    max: 20,
    exclusiveMax: false,
    exclusiveMin: false,
  },
  allowedNumbers: {
    type: SimpleSchema.Integer,
    optional: true,
    allowedValues: [1, 2, 3],
  },
  allowedNumbersArray: {
    type: Array,
    optional: true,
  },
  'allowedNumbersArray.$': {
    type: SimpleSchema.Integer,
    allowedValues: [1, 2, 3],
  },
  decimal: {
    type: Number,
    optional: true,
  },
  date: {
    type: Date,
    optional: true,
  },
  dateArray: {
    type: Array,
    optional: true,
  },
  'dateArray.$': {
    type: Date,
  },
  minMaxDate: {
    type: Date,
    optional: true,
    min: (new Date(Date.UTC(2013, 0, 1))),
    max: (new Date(Date.UTC(2013, 11, 31))),
  },
  minMaxDateCalculated: {
    type: Date,
    optional: true,
    min() {
      return (new Date(Date.UTC(2013, 0, 1)));
    },
    max() {
      return (new Date(Date.UTC(2013, 11, 31)));
    },
  },
  email: {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    optional: true,
  },
  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    optional: true,
  },
  customObject: {
    type: Address,
    optional: true,
    blackbox: true,
  },
  blackBoxObject: {
    type: Object,
    optional: true,
    blackbox: true,
  },
  noTrimString: {
    type: String,
    optional: true,
    trim: false,
  },
});

const autoValues = new SimpleSchema({
  name: {
    type: String,
  },
  someDefault: {
    type: SimpleSchema.Integer,
    autoValue() {
      if (!this.isSet) {
        return 5;
      }
    },
  },
  updateCount: {
    type: SimpleSchema.Integer,
    autoValue() {
      if (!this.operator) return 0;
      return { $inc: 1 };
    },
  },
  content: {
    type: String,
    optional: true,
  },
  firstWord: {
    type: String,
    optional: true,
    autoValue() {
      const content = this.field('content');
      if (content.isSet) return content.value.split(' ')[0];
      this.unset();
    },
  },
  updatesHistory: {
    type: Array,
    optional: true,
    autoValue() {
      const content = this.field('content');
      if (content.isSet) {
        if (!this.operator) {
          return [{
            date: new Date(),
            content: content.value,
          }];
        }
        return {
          $push: {
            date: new Date(),
            content: content.value,
          },
        };
      }
    },
  },
  'updatesHistory.$': {
    type: Object,
  },
  'updatesHistory.$.date': {
    type: Date,
    optional: true,
  },
  'updatesHistory.$.content': {
    type: String,
    optional: true,
  },
  avArrayOfObjects: {
    type: Array,
    optional: true,
  },
  'avArrayOfObjects.$': {
    type: Object,
  },
  'avArrayOfObjects.$.a': {
    type: String,
  },
  'avArrayOfObjects.$.foo': {
    type: String,
    autoValue() {
      return 'bar';
    },
  },
});

function getTest(given, expected, isModifier) {
  return function() {
    ss.clean(given, { isModifier, mutate: true });
    expect(given).toEqual(expected);
  };
}

describe('clean', function () {
  describe('normal doc', function () {
    it('when you clean a good object it is still good', getTest({ string: 'This is a string' }, { string: 'This is a string' }, false));
    it('when you clean a bad object it is now good', getTest({ string: 'This is a string', admin: true }, { string: 'This is a string' }, false));
    it('type conversion works', getTest({ string: 1 }, { string: '1' }, false));
    it('remove empty strings', getTest({ string: '' }, {}, false));
    it('remove whitespace only strings (trimmed to empty strings)', getTest({ string: '    ' }, {}, false));

    const myObj = new Address('New York', 'NY');
    it('when you clean a good custom object it is still good', getTest({ customObject: myObj }, { customObject: myObj }, false));

    const myObj2 = {
      foo: 'bar',
      'foobar.foobar': 10000,
    };
    it('when you clean a good blackbox object it is still good', getTest({ blackBoxObject: myObj2 }, { blackBoxObject: myObj2 }, false));
  });

  describe('$set', function () {
    it('when you clean a good object it is still good', getTest({ $set: { string: 'This is a string' } }, { $set: { string: 'This is a string' } }, true));
    it('when you clean a bad object it is now good', getTest({ $set: { string: 'This is a string', admin: true } }, { $set: { string: 'This is a string' } }, true));
    it('type conversion works', getTest({ $set: { string: 1 } }, { $set: { string: '1' } }, true));

    // $set must be removed, too, because Mongo 2.6+ throws errors when operator object is empty
    it('move empty strings to $unset', getTest({ $set: { string: '' } }, { $unset: { string: '' } }, true));
  });

  describe('$unset', function () {
    // We don't want the filter option to apply to $unset operator because it should be fine
    // to unset anything. For example, the schema might have changed and now we're running some
    // server conversion to unset properties that are no longer part of the schema.

    it('when you clean a good object it is still good', getTest({ $unset: { string: null } }, { $unset: { string: null } }, true));
    it('when you clean an object with extra unset keys, they stay there', getTest({ $unset: { string: null, admin: null } }, { $unset: { string: null, admin: null } }, true));
    it('cleaning does not type convert the $unset value because it is a meaningless value', getTest({ $unset: { string: 1 } }, { $unset: { string: 1 } }, true));
  });

  describe('$setOnInsert', function () {
    it('when you clean a good object it is still good', getTest({ $setOnInsert: { string: 'This is a string' } }, { $setOnInsert: { string: 'This is a string' } }, true));
    it('when you clean a bad object it is now good', getTest({ $setOnInsert: { string: 'This is a string', admin: true } }, { $setOnInsert: { string: 'This is a string' } }, true));
    it('type conversion works', getTest({ $setOnInsert: { string: 1 } }, { $setOnInsert: { string: '1' } }, true));
  });

  describe('$inc', function () {
    it('when you clean a good object it is still good', getTest({ $inc: { number: 1 } }, { $inc: { number: 1 } }, true));
    it('when you clean a bad object it is now good', getTest({ $inc: { number: 1, admin: 1 } }, { $inc: { number: 1 } }, true));
    it('type conversion works', getTest({ $inc: { number: '1' } }, { $inc: { number: 1 } }, true));
  });

  describe('$addToSet', function () {
    it('when you clean a good object it is still good', getTest({ $addToSet: { allowedNumbersArray: 1 } }, { $addToSet: { allowedNumbersArray: 1 } }, true));
    it('when you clean a bad object it is now good', getTest({ $addToSet: { allowedNumbersArray: 1, admin: 1 } }, { $addToSet: { allowedNumbersArray: 1 } }, true));
    it('type conversion works', getTest({ $addToSet: { allowedNumbersArray: '1' } }, { $addToSet: { allowedNumbersArray: 1 } }, true));
  });

  describe('$addToSet with $each', function () {
    it('when you clean a good object it is still good', getTest({ $addToSet: { allowedNumbersArray: { $each: [1, 2, 3] } } }, { $addToSet: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
    it('when you clean a bad object it is now good', getTest({ $addToSet: { allowedNumbersArray: { $each: [1, 2, 3] }, admin: { $each: [1, 2, 3] } } }, { $addToSet: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
    it('type conversion works', getTest({ $addToSet: { allowedNumbersArray: { $each: ['1', 2, 3] } } }, { $addToSet: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
  });

  describe('$push', function () {
    it('when you clean a good object it is still good', getTest({ $push: { allowedNumbersArray: 1 } }, { $push: { allowedNumbersArray: 1 } }, true));
    it('when you clean a bad object it is now good', getTest({ $push: { allowedNumbersArray: 1, admin: 1 } }, { $push: { allowedNumbersArray: 1 } }, true));
    it('type conversion works', getTest({ $push: { allowedNumbersArray: '1' } }, { $push: { allowedNumbersArray: 1 } }, true));
  });

  describe('$push with $each', function () {
    it('when you clean a good object it is still good', getTest({ $push: { allowedNumbersArray: { $each: [1, 2, 3] } } }, { $push: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
    it('when you clean a bad object it is now good', getTest({ $push: { allowedNumbersArray: { $each: [1, 2, 3] }, admin: { $each: [1, 2, 3] } } }, { $push: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
    it('type conversion works', getTest({ $push: { allowedNumbersArray: { $each: ['1', 2, 3] } } }, { $push: { allowedNumbersArray: { $each: [1, 2, 3] } } }, true));
  });

  describe('$pull', function () {
    it('when you clean a good object it is still good', getTest({ $pull: { allowedNumbersArray: 1 } }, { $pull: { allowedNumbersArray: 1 } }, true));
    it('when you clean a bad object it is now good', getTest({ $pull: { allowedNumbersArray: 1, admin: 1 } }, { $pull: { allowedNumbersArray: 1 } }, true));
    it('type conversion works', getTest({ $pull: { allowedNumbersArray: '1' } }, { $pull: { allowedNumbersArray: 1 } }, true));
  });

  describe('$pull with query2', function () {
    it('when you clean a good object it is still good', getTest({ $pull: { allowedNumbersArray: { $in: [1] } } }, { $pull: { allowedNumbersArray: { $in: [1] } } }, true));
    it('when you clean a bad object it is now good', getTest({ $pull: { allowedNumbersArray: { $in: [1] }, admin: { $in: [1] } } }, { $pull: { allowedNumbersArray: { $in: [1] } } }, true));
    it('type conversion does not work within query2', getTest({ $pull: { allowedNumbersArray: { $in: ['1'] } } }, { $pull: { allowedNumbersArray: { $in: ['1'] } } }, true));
    it('more tests', getTest({ $pull: { allowedNumbersArray: { foo: { $in: [1] } } } }, { $pull: { allowedNumbersArray: { foo: { $in: [1] } } } }, true));
  });

  describe('$pop', function () {
    it('when you clean a good object it is still good', getTest({ $pop: { allowedNumbersArray: 1 } }, { $pop: { allowedNumbersArray: 1 } }, true));
    it('when you clean a bad object it is now good', getTest({ $pop: { allowedNumbersArray: 1, admin: 1 } }, { $pop: { allowedNumbersArray: 1 } }, true));
    it('type conversion works', getTest({ $pop: { allowedNumbersArray: '1' } }, { $pop: { allowedNumbersArray: 1 } }, true));
  });

  describe('$pullAll', function () {
    it('when you clean a good object it is still good', getTest({ $pullAll: { allowedNumbersArray: [1, 2, 3] } }, { $pullAll: { allowedNumbersArray: [1, 2, 3] } }, true));
    it('type conversion works', getTest({ $pullAll: { allowedNumbersArray: ['1', 2, 3] } }, { $pullAll: { allowedNumbersArray: [1, 2, 3] } }, true));
  });

  describe('blackbox', function () {
    // Cleaning shouldn't remove anything within blackbox
    it('1', getTest({ blackBoxObject: { foo: 1 } }, { blackBoxObject: { foo: 1 } }));
    it('2', getTest({ blackBoxObject: { foo: [1] } }, { blackBoxObject: { foo: [1] } }));
    it('3', getTest({ blackBoxObject: { foo: [{ bar: 1 }] } }, { blackBoxObject: { foo: [{ bar: 1 }] } }));
    it('4', getTest({ $set: { blackBoxObject: { foo: 1 } } }, { $set: { blackBoxObject: { foo: 1 } } }, true));
    it('5', getTest({ $set: { blackBoxObject: { foo: [1] } } }, { $set: { blackBoxObject: { foo: [1] } } }, true));
    it('6', getTest({ $set: { blackBoxObject: { foo: [{ bar: 1 }] } } }, { $set: { blackBoxObject: { foo: [{ bar: 1 }] } } }, true));
    it('7', getTest({ $set: { 'blackBoxObject.email.verificationTokens.$': { token: 'Hi' } } }, { $set: { 'blackBoxObject.email.verificationTokens.$': { token: 'Hi' } } }, true));
    it('8', getTest({ $set: { 'blackBoxObject.email.verificationTokens.$.token': 'Hi' } }, { $set: { 'blackBoxObject.email.verificationTokens.$.token': 'Hi' } }, true));
    it('9', getTest(
      { $push: { 'blackBoxObject.email.verificationTokens': { token: 'Hi' } } },
      { $push: { 'blackBoxObject.email.verificationTokens': { token: 'Hi' } } },
      true
    ));
  });

  it('trim strings', function () {
    function doTest(isModifier, given, expected) {
      const cleanObj = ss.clean(given, {
        mutate: true,
        filter: false,
        autoConvert: false,
        removeEmptyStrings: false,
        trimStrings: true,
        getAutoValues: false,
        isModifier,
      });
      expect(cleanObj).toEqual(expected);
    }

    // DOC
    doTest(false, { string: '    This is a string    ' }, { string: 'This is a string' });

    // $SET
    doTest(true, { $set: { string: '    This is a string    ' } }, { $set: { string: 'This is a string' } });

    // $UNSET is ignored
    doTest(true, { $unset: { string: '    This is a string    ' } }, { $unset: { string: '    This is a string    ' } });

    // $SETONINSERT
    doTest(true, { $setOnInsert: { string: '    This is a string    ' } }, { $setOnInsert: { string: 'This is a string' } });

    // $ADDTOSET
    doTest(true, { $addToSet: { minMaxStringArray: '    This is a string    ' } }, { $addToSet: { minMaxStringArray: 'This is a string' } });

    // $ADDTOSET WITH EACH
    doTest(true, { $addToSet: { minMaxStringArray: { $each: ['    This is a string    '] } } }, { $addToSet: { minMaxStringArray: { $each: ['This is a string'] } } });

    // $PUSH
    doTest(true, { $push: { minMaxStringArray: '    This is a string    ' } }, { $push: { minMaxStringArray: 'This is a string' } });

    // $PUSH WITH EACH
    doTest(true, { $push: { minMaxStringArray: { $each: ['    This is a string    '] } } }, { $push: { minMaxStringArray: { $each: ['This is a string'] } } });

    // $PULL
    doTest(true, { $pull: { minMaxStringArray: '    This is a string    ' } }, { $pull: { minMaxStringArray: 'This is a string' } });

    // $POP
    doTest(true, { $pop: { minMaxStringArray: '    This is a string    ' } }, { $pop: { minMaxStringArray: 'This is a string' } });

    // $PULLALL
    doTest(true, { $pullAll: { minMaxStringArray: ['    This is a string    '] } }, { $pullAll: { minMaxStringArray: ['This is a string'] } });

    // Trim false
    doTest(false, { noTrimString: '    This is a string    ' }, { noTrimString: '    This is a string    ' });

    // Trim false with autoConvert
    const cleanObj = ss.clean({ noTrimString: '    This is a string    ' }, {
      filter: false,
      autoConvert: true,
      removeEmptyStrings: false,
      trimStrings: true,
      getAutoValues: false,
      isModifier: false,
    });
    expect(cleanObj).toEqual({ noTrimString: '    This is a string    ' });
  });

  describe('miscellaneous', function () {
    it('does not $unset when the prop is within an object that is already being $set', function () {
      const optionalInObject = new SimpleSchema({
        requiredObj: {
          type: Object,
        },
        'requiredObj.optionalProp': {
          type: String,
          optional: true,
        },
        'requiredObj.requiredProp': {
          type: String,
        },
      });

      const myObj = { $set: { requiredObj: { requiredProp: 'blah', optionalProp: '' } } };
      optionalInObject.clean(myObj, { isModifier: true, mutate: true });

      expect(myObj).toEqual({ $set: { requiredObj: { requiredProp: 'blah' } } });
    });

    it('type convert to array', function () {
      const myObj1 = { allowedStringsArray: 'tuna' };
      ss.clean(myObj1, { mutate: true });
      expect(myObj1).toEqual({ allowedStringsArray: ['tuna'] });

      const myObj2 = { $set: { allowedStringsArray: 'tuna' } };
      ss.clean(myObj2, { isModifier: true, mutate: true });
      expect(myObj2).toEqual({ $set: { allowedStringsArray: ['tuna'] } });
    });

    it('multi-dimensional arrays', function () {
      const schema = new SimpleSchema({
        geometry: {
          type: Object,
          optional: true,
        },
        'geometry.coordinates': {
          type: Array,
        },
        'geometry.coordinates.$': {
          type: Array,
        },
        'geometry.coordinates.$.$': {
          type: Array,
        },
        'geometry.coordinates.$.$.$': {
          type: SimpleSchema.Integer,
        },
      });

      const doc = {
        geometry: {
          coordinates: [
            [
              [30, 50],
            ],
          ],
        },
      };

      const expected = JSON.stringify(doc);
      expect(JSON.stringify(schema.clean(doc))).toEqual(expected);
    });

    it('remove null', function () {
      const schema = new SimpleSchema({
        names: { type: Array },
        'names.$': { type: String },
      });

      const doc = {
        names: [null],
      };
      schema.clean(doc, { removeNullsFromArrays: true, mutate: true });
      expect(doc).toEqual({
        names: [],
      });
    });

    it('remove object', function () {
      const schema = new SimpleSchema({
        names: { type: Array },
        'names.$': { type: String },
      });

      const doc = {
        names: [{ hello: 'world' }],
      };
      schema.clean(doc, { mutate: true });
      expect(doc).toEqual({
        names: [],
      });
    });
  });

  describe('autoValue', function () {
    it('has correct information in function context - empty', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(false);
            expect(this.value).toBe(undefined);
            expect(this.operator).toBe(null);

            const foo = this.field('foo');
            expect(foo.isSet).toBe(false);
            expect(foo.value).toBe(undefined);
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(false);
            expect(fooSibling.value).toBe(undefined);
            expect(fooSibling.operator).toBe(null);
          },
        },
      });
      schema.clean({});
    });

    it('has correct information in function context - normal other key', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(false);
            expect(this.value).toBe(undefined);
            expect(this.operator).toBe(null);

            const foo = this.field('foo');
            expect(foo.isSet).toBe(true);
            expect(foo.value).toEqual('clown');
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(true);
            expect(fooSibling.value).toEqual('clown');
            expect(fooSibling.operator).toBe(null);
          },
        },
      });
      schema.clean({
        foo: 'clown',
      });
    });

    it('has correct information in function context - normal self and other key', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(true);
            expect(this.value).toBe(true);
            expect(this.operator).toBe(null);

            const foo = this.field('foo');
            expect(foo.isSet).toBe(true);
            expect(foo.value).toEqual('clown');
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(true);
            expect(fooSibling.value).toEqual('clown');
            expect(fooSibling.operator).toBe(null);
          },
        },
      });
      schema.clean({
        foo: 'clown',
        bar: true,
      });
    });

    it('has correct information in function context - normal self and no other key with unset', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(true);
            expect(this.value).toBe(false);
            expect(this.operator).toBe(null);

            const foo = this.field('foo');
            expect(foo.isSet).toBe(false);
            expect(foo.value).toBe(undefined);
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(false);
            expect(fooSibling.value).toBe(undefined);
            expect(fooSibling.operator).toBe(null);
            this.unset();
          },
        },
      });
      const doc = {
        bar: false,
      };
      expect(schema.clean(doc)).toEqual({});
    });

    it('has correct information in function context - $set self and no other key', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(true);
            expect(this.value).toBe(false);
            expect(this.operator).toBe('$set');

            const foo = this.field('foo');
            expect(foo.isSet).toBe(false);
            expect(foo.value).toBe(undefined);
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(false);
            expect(fooSibling.value).toBe(undefined);
            expect(fooSibling.operator).toBe(null);
          },
        },
      });

      const doc = {
        $set: {
          bar: false,
        },
      };
      schema.clean(doc);
      expect(doc).toEqual({
        $set: {
          bar: false,
        },
      });
    });

    it('has correct information in function context - $set self and another key and change self', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(true);
            expect(this.value).toBe(false);
            expect(this.operator).toEqual('$set');

            const foo = this.field('foo');
            expect(foo.isSet).toBe(true);
            expect(foo.value).toEqual('clown');
            expect(foo.operator).toEqual('$set');

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(true);
            expect(fooSibling.value).toEqual('clown');
            expect(fooSibling.operator).toEqual('$set');

            return true;
          },
        },
      });

      const doc = {
        $set: {
          foo: 'clown',
          bar: false,
        },
      };
      expect(schema.clean(doc)).toEqual({
        $set: {
          foo: 'clown',
          bar: true,
        },
      });
    });

    it('has correct information in function context - adds $set when missing', function () {
      const schema = new SimpleSchema({
        foo: {
          type: String,
          optional: true,
        },
        bar: {
          type: Boolean,
          optional: true,
          autoValue() {
            expect(this.isSet).toBe(false);
            expect(this.value).toBe(undefined);
            expect(this.operator).toEqual('$set');

            const foo = this.field('foo');
            expect(foo.isSet).toBe(false);
            expect(foo.value).toBe(undefined);
            expect(foo.operator).toBe(null);

            const fooSibling = this.siblingField('foo');
            expect(fooSibling.isSet).toBe(false);
            expect(fooSibling.value).toBe(undefined);
            expect(fooSibling.operator).toBe(null);

            return {
              $set: true,
            };
          },
        },
      });

      expect(schema.clean({}, { isModifier: true })).toEqual({
        $set: {
          bar: true,
        },
      });
    });

    it('base', function () {
      let o;

      function avClean(obj, exp, opts) {
        expect(autoValues.clean(obj, opts)).toEqual(exp);
      }

      avClean({
        name: 'Test',
        firstWord: 'Illegal to manually set value',
      }, {
        name: 'Test',
        someDefault: 5,
        updateCount: 0,
      });

      avClean({
        name: 'Test',
        someDefault: 20,
      }, {
        name: 'Test',
        someDefault: 20,
        updateCount: 0,
      });

      o = {
        name: 'Test',
        content: 'Hello world!',
      };
      autoValues.clean(o, { mutate: true });
      expect(o.firstWord).toEqual('Hello');
      expect(o.updatesHistory.length).toEqual(1);
      expect(o.updatesHistory[0].content).toEqual('Hello world!');

      // $each in pseudo modifier
      const eachAV = new SimpleSchema({
        psuedoEach: {
          type: Array,
          optional: true,
          autoValue() {
            if (this.isSet && this.operator === '$set') {
              return {
                $push: {
                  $each: this.value,
                },
              };
            }
          },
        },
        'psuedoEach.$': {
          type: String,
        },
      });
      o = {
        $set: {
          psuedoEach: ['foo', 'bar'],
        },
      };
      eachAV.clean(o, { mutate: true });

      expect(o).toEqual({
        $push: {
          psuedoEach: {
            $each: ['foo', 'bar'],
          },
        },
      });

      // autoValues in object in array with modifier
      o = {
        $push: {
          avArrayOfObjects: {
            a: 'b',
          },
        },
      };
      autoValues.clean(o, { mutate: true });

      expect(o).toEqual({
        $push: {
          avArrayOfObjects: {
            a: 'b',
            foo: 'bar',
          },
        },
        $set: {
          someDefault: 5,
        },
        $inc: {
          updateCount: 1,
        },
      });

      o = {
        $set: {
          avArrayOfObjects: [{
            a: 'b',
          }, {
            a: 'c',
          }],
        },
      };
      autoValues.clean(o, { mutate: true });

      expect(o).toEqual({
        $set: {
          avArrayOfObjects: [{
            a: 'b',
            foo: 'bar',
          }, {
            a: 'c',
            foo: 'bar',
          }],
          someDefault: 5,
        },
        $inc: {
          updateCount: 1,
        },
      });
    });

    it('defaultValue', function () {
      const defaultValues = new SimpleSchema({
        name: {
          type: String,
          defaultValue: 'Test',
          optional: true,
        },
        a: {
          type: Object,
          optional: true,
        },
        'a.b': {
          type: String,
          defaultValue: 'Test',
          optional: true,
        },
        b: {
          type: Array,
          optional: true,
        },
        'b.$': {
          type: Object,
        },
        'b.$.a': {
          type: String,
          defaultValue: 'Test',
          optional: true,
        },
        strVals: {
          type: Array,
          defaultValue: [],
          optional: true,
        },
        'strVals.$': {
          type: String,
        },
      });

      function avClean(obj, exp) {
        expect(defaultValues.clean(obj)).toEqual(exp);
      }

      avClean({}, {
        name: 'Test',
        a: {
          b: 'Test',
        },
        strVals: [],
      });

      avClean({
        strVals: ['foo', 'bar'],
      }, {
        name: 'Test',
        a: {
          b: 'Test',
        },
        strVals: ['foo', 'bar'],
      });

      avClean({
        name: 'Test1',
        a: {
          b: 'Test1',
        },
      }, {
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        strVals: [],
      });

      avClean({
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [],
      }, {
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [],
        strVals: [],
      });

      avClean({
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [{}],
      }, {
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [{
          a: 'Test',
        }],
        strVals: [],
      });

      avClean({
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [{
          a: 'Test1',
        }, {}],
      }, {
        name: 'Test1',
        a: {
          b: 'Test1',
        },
        b: [{
          a: 'Test1',
        }, {
          a: 'Test',
        }],
        strVals: [],
      });

      // Updates should not be affected, but should get $setOnInsert
      avClean({
        $addToSet: {
          strVals: 'new value',
        },
      }, {
        $addToSet: {
          strVals: 'new value',
        },
        $setOnInsert: {
          name: 'Test',
          'a.b': 'Test',
        },
      });
    });

    it('objects in arrays', function () {
      const subSchema = new SimpleSchema({
        value: {
          type: String,
          autoValue() {
            expect(this.isSet).toBe(true);
            expect(this.operator).toEqual('$set');
            expect(this.value).toEqual('should be overridden by autovalue');
            return 'autovalue';
          },
        },
      });

      const schema = new SimpleSchema({
        children: {
          type: Array,
        },
        'children.$': {
          type: subSchema,
        },
      });

      const mod = {
        $set: {
          'children.$.value': 'should be overridden by autovalue',
        },
      };
      schema.clean(mod, { mutate: true });

      expect(mod.$set['children.$.value']).toEqual('autovalue');
    });

    it('operator correct for $pull', function () {
      let called = false;

      const schema = new SimpleSchema({
        foo: {
          type: Array,
          autoValue() {
            called = true;
            expect(this.operator).toEqual('$pull');
          },
        },
        'foo.$': {
          type: String,
        },
      });

      const mod = {
        $pull: {
          foo: 'bar',
        },
      };
      schema.clean(mod);

      expect(called).toBe(true);
    });

    it('issue 340', function () {
      let called = 0;

      const schema = new SimpleSchema({
        field1: {
          type: SimpleSchema.Integer,
        },
        field2: {
          type: String,
          autoValue() {
            called++;
            expect(this.field('field1').value).toBe(1);
            expect(this.siblingField('field1').value).toBe(1);
            return 'foo';
          },
        },
      });

      schema.clean({
        field1: 1,
      });
      schema.clean({
        $set: {
          field1: 1,
        },
      });

      expect(called).toBe(2);
    });

    it('issue 426', function () {
      const schema = new SimpleSchema({
        name: {
          type: String,
        },
        images: {
          type: Array,
          label: 'Images',
          minCount: 0,
          defaultValue: [],
        },
        'images.$': {
          type: Object,
          label: 'Image',
        },
      });

      const doc = {
        name: 'Test',
      };
      expect(schema.clean(doc)).toEqual({
        name: 'Test',
        images: [],
      });
    });

    it('array items', function () {
      const schema = new SimpleSchema({
        tags: {
          type: Array,
          optional: true,
        },
        'tags.$': {
          type: String,
          autoValue() {
            if (this.isSet) return this.value.toLowerCase();
          },
        },
      });

      const obj = {
        tags: [],
      };
      expect(schema.clean(obj)).toEqual({
        tags: [],
      });

      const obj2 = {
        tags: ['FOO', 'BAR'],
      };
      expect(schema.clean(obj2)).toEqual({
        tags: ['foo', 'bar'],
      });
    });
  });

  it('should clean sub schema', function () {
    const nestedSchema = new SimpleSchema({
      integer: SimpleSchema.Integer,
    });

    const schema = new SimpleSchema({
      test: nestedSchema,
    });

    const cleanedObject = schema.clean({
      test: {
        integer: '1',
      },
    });
    expect(cleanedObject).toEqual({
      test: {
        integer: 1,
      },
    });
  });
});
