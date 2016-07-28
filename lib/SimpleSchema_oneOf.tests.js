/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema', function () {
  describe('oneOf', function () {
    it('allows either type', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, Number),
      });

      expect(function () {
        schema.validate({ foo: 1 });
      }).toNotThrow();

      expect(function () {
        schema.validate({ foo: 'bar' });
      }).toNotThrow();

      expect(function () {
        schema.validate({ foo: false });
      }).toThrow();
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
