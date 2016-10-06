/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema - sub schemas', function () {
  describe('validation', function () {
    it('should validate sub schemas', function () {
      const nestedSchema = new SimpleSchema({
        integer: SimpleSchema.Integer,
      });

      const schema = new SimpleSchema({
        nestedSchema,
      });

      const schemaContext = schema.newContext();
      schemaContext.validate({
        nestedSchema: {},
      });

      expect(schemaContext.validationErrors()).toEqual([{
        name: 'nestedSchema.integer',
        type: 'required',
        value: undefined,
      }]);
      expect(schemaContext.keyErrorMessage('nestedSchema.integer')).toEqual('Integer is required');
    });
  });
});
