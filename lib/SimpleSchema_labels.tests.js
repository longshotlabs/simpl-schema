/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema - label', function () {
  it('inflection', function () {
    const schema = new SimpleSchema({
      minMaxNumber: { type: SimpleSchema.Integer },
      obj: { type: Object },
      'obj.someString': { type: String },
    });

    expect(schema.label('minMaxNumber')).toEqual('Min max number');
    expect(schema.label('obj.someString')).toEqual('Some string');
  });

  it('dynamic', function () {
    const schema = new SimpleSchema({
      minMaxNumber: { type: SimpleSchema.Integer },
      obj: { type: Object },
      'obj.someString': { type: String },
    });

    expect(schema.label('obj.someString')).toEqual('Some string');

    schema.labels({
      'obj.someString': 'A different label',
    });

    expect(schema.label('obj.someString')).toEqual('A different label');
  });

  it('callback', function () {
    const schema = new SimpleSchema({
      minMaxNumber: { type: SimpleSchema.Integer },
      obj: { type: Object },
      'obj.someString': { type: String },
    });

    expect(schema.label('obj.someString')).toEqual('Some string');

    schema.labels({
      'obj.someString': () => 'A callback label',
    });

    expect(schema.label('obj.someString')).toEqual('A callback label');
  });

  it('should allow apostrophes ("\'") in labels', () => {
    const schema = new SimpleSchema({
      foo: {
        type: String,
        label: 'Manager/supervisor\'s name',
      },
    });
    expect(schema.label('foo')).toEqual('Manager/supervisor\'s name');
  });
});
