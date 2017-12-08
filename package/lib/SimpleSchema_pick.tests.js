/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema', function () {
  it('pick', function () {
    const schema = new SimpleSchema({
      foo: { type: Object },
      'foo.bar': { type: String },
      fooArray: { type: Array },
      'fooArray.$': { type: Object },
      'fooArray.$.bar': { type: String },
    });

    let newSchema = schema.pick('foo');
    expect(Object.keys(newSchema.schema())).toEqual(['foo', 'foo.bar']);

    newSchema = schema.pick('fooArray');
    expect(Object.keys(newSchema.schema())).toEqual(['fooArray', 'fooArray.$', 'fooArray.$.bar']);

    newSchema = schema.pick('foo', 'fooArray');
    expect(Object.keys(newSchema.schema())).toEqual(['foo', 'foo.bar', 'fooArray', 'fooArray.$', 'fooArray.$.bar']);

    newSchema = schema.pick('blah');
    expect(Object.keys(newSchema.schema())).toEqual([]);
  });
});
