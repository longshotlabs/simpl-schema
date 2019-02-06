/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('Rules', function () {
  it('Rules should have the document being evaluated', function () {
    const validationContext = new SimpleSchema({
      foo: {
        type: Number,
      },
      bar: {
        type: Number,
        max(validateDoc) {
          return 1; // validateDoc.foo - 1;
        },
      },
    }).newContext();
    validationContext.validate({ foo: 1, bar: 2 });
    expect(validationContext.validationErrors().length).toBe(1);
    validationContext.validate({ foo: 2, bar: 1 });
    expect(validationContext.validationErrors().length).toBe(0);
  });
});
