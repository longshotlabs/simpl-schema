/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema', function () {
  describe('oneOf', function () {
    it('allows either type', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, Number, Date),
      });

      const test1 = { foo: 1 };
      expect(function test1func () {
        schema.validate(test1);
      }).toNotThrow();
      expect(test1.foo).toBeA('number');

      const test2 = { foo: 'bar' };
      expect(function test2func () {
        schema.validate(test2);
      }).toNotThrow();
      expect(test2.foo).toBeA('string');

      const test3 = { foo: new Date() };
      expect(function test2func () {
        schema.validate(test3);
      }).toNotThrow();
      expect(test3.foo instanceof Date).toBe(true);

      const test4 = { foo: false };
      expect(function test3func () {
        schema.validate(test4);
      }).toThrow();
      expect(test4.foo).toBeA('boolean');
    });

    it.skip('allows either type including schemas', function () {
      const schemaOne = new SimpleSchema({
        itemRef: String,
        partNo: String,
      });

      const schemaTwo = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(String, schemaOne, schemaTwo),
      });

      let isValid = combinedSchema.namedContext().validate({
        item: 'foo',
      });
      console.log(combinedSchema.namedContext().validationErrors());
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'hhh',
          partNo: 'ttt',
        },
      });
      console.log(combinedSchema.namedContext().validationErrors());
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'hhh',
          partNo: 'ttt',
        },
      });
      console.log(combinedSchema.namedContext().validationErrors());
      expect(isValid).toBe(true);
    });

    it('is valid as long as one min value is met', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf({
          type: SimpleSchema.Integer,
          min: 5,
        }, {
          type: SimpleSchema.Integer,
          min: 10,
        }),
      });

      expect(function () {
        schema.validate({ foo: 7 });
      }).toNotThrow();
    });

    it('is invalid if neither min value is met', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf({
          type: SimpleSchema.Integer,
          min: 5,
        }, {
          type: SimpleSchema.Integer,
          min: 10,
        }),
      });

      expect(function () {
        schema.validate({ foo: 3 });
      }).toThrow();
    });
  });
});
