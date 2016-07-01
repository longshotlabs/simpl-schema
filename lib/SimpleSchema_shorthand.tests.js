import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema', function () {
  it('shorthand', function () {
    const ss1 = new SimpleSchema({
      name: String,
      count: Number,
      exp: /foo/
    });

    const ss1SchemaObj = ss1.schema();

    expect(ss1SchemaObj.name).toEqual({
      type: String,
      optional: false,
      label: 'Name',
    });
    expect(ss1SchemaObj.count).toEqual({
      type: Number,
      optional: false,
      label: 'Count',
    });
    expect(ss1SchemaObj.exp).toEqual({
      type: String,
      regEx: /foo/,
      optional: false,
      label: 'Exp',
    });

    const ss2 = new SimpleSchema({
      name: [String],
      count: [Number]
    });

    const ss2SchemaObj = ss2.schema();

    expect(ss2SchemaObj.name).toEqual({
      type: Array,
      optional: false,
      label: 'Name',
    });
    expect(ss2SchemaObj['name.$']).toEqual({
      type: String,
      optional: true,
      label: 'Name',
    });
    expect(ss2SchemaObj.count).toEqual({
      type: Array,
      optional: false,
      label: 'Count',
    });
    expect(ss2SchemaObj['count.$']).toEqual({
      type: Number,
      optional: true,
      label: 'Count',
    });
  });
});
