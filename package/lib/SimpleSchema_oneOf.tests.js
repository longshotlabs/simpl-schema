/* eslint-disable func-names, prefer-arrow-callback */

import expect from 'expect';
import { SimpleSchema } from './SimpleSchema';

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

    it('allows either type including schemas (first)', function () {
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
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'hhh',
          partNo: 'ttt',
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'hhh',
          partNo: 'ttt',
        },
      });
      expect(isValid).toBe(true);
    });

    it('allows either type including schemas (second)', function () {
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(String, schemaOne, schemaTwo),
      });

      let isValid = combinedSchema.namedContext().validate({
        item: 'foo',
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'hhh',
          partNo: 'ttt',
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'hhh',
          partNo: 'ttt',
        },
      });
      expect(isValid).toBe(true);
    });

    it('allows either type including schemas (nested)', function () {
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
        obj: Object,
        'obj.inner': String,
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
        obj2: Object,
        'obj2.inner': String,
      });

      const schemaA = new SimpleSchema({
        item1: SimpleSchema.oneOf(schemaOne, schemaTwo),
      });

      const schemaB = new SimpleSchema({
        item2: SimpleSchema.oneOf(schemaOne, schemaTwo),
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaA, schemaB),
      });

      let isValid = combinedSchema.namedContext().validate({
        item: {
          item1: {
            itemRef: 'test',
            partNo: 'test',
            obj: {
              inner: 'test',
            },
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          item2: {
            itemRef: 'test',
            partNo: 'test',
            obj: {
              inner: 'test',
            },
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          item1: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj2: {
              inner: 'test',
            },
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          item2: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj2: {
              inner: 'test',
            },
          },
        },
      });
      expect(isValid).toBe(true);
      isValid = combinedSchema.namedContext().validate({
        item: {
          item2: {
            badKey: 'test',
            partNo: 'test',
          },
        },
      });
      expect(isValid).toBe(false);
      isValid = combinedSchema.namedContext().validate({
        item: {
          item2: {
          },
        },
      });
      expect(isValid).toBe(false);
    });

    it('allows either type including schemas (nested differing types)', function () {
      // this test case is to ensure we correctly use a new "root" schema for nested objects
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
        obj: Object,
        'obj.inner': String,
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
        obj: Object,
        'obj.inner': Number,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaOne, schemaTwo),
      });
      let isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'test',
          partNo: 'test',
          obj: {
            inner: 'test',
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'test',
          partNo: 'test',
          obj: {
            inner: 2,
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'test',
          partNo: 'test',
          obj: {
            inner: 2,
          },
        },
      });
      expect(isValid).toBe(false);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'test',
          partNo: 'test',
          obj: {
            inner: 'test',
          },
        },
      });
      expect(isValid).toBe(false);
    });

    it('allows either type including schemas (nested arrays)', function () {
      // this test case is to ensure we correctly use a new "root" schema for nested objects
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
        obj: Object,
        'obj.inner': [String],
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
        obj: Object,
        'obj.inner': [Number],
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaOne, schemaTwo),
      });
      let isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'test',
          partNo: 'test',
          obj: {
            inner: ['test'],
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'test',
          partNo: 'test',
          obj: {
            inner: [2],
          },
        },
      });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        item: {
          itemRef: 'test',
          partNo: 'test',
          obj: {
            inner: [2, 'test'],
          },
        },
      });
      expect(isValid).toBe(false);

      isValid = combinedSchema.namedContext().validate({
        item: {
          anotherIdentifier: 'test',
          partNo: 'test',
          obj: {
            inner: ['test', 2],
          },
        },
      });
      expect(isValid).toBe(false);
    });

    it('allows either type including schemas (mixed arrays)', function () {
      const schemaTwo = new SimpleSchema({
        itemRef: String,
      });

      const schemaOne = new SimpleSchema({
        itemRef: Number,
      });

      const combinedSchema = new SimpleSchema({
        item: Array,
        'item.$': SimpleSchema.oneOf(schemaOne, schemaTwo),
      });
      const isValid = combinedSchema.namedContext().validate({
        item: [{ itemRef: 'test' }, { itemRef: 2 }],
      });
      expect(isValid).toBe(true);
    });

    it('allows either type including schemas (maybe arrays)', function () {
      const schemaOne = new SimpleSchema({
        itemRef: Number,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaOne, Array),
        'item.$': schemaOne,
      });
      let isValid = combinedSchema.namedContext().validate({
        item: [{ itemRef: 2 }],
      });
      expect(isValid).toBe(true);
      isValid = combinedSchema.namedContext().validate({
        item: { itemRef: 2 },
      });
      expect(isValid).toBe(true);
    });

    it('allows either type including schemas (maybe mixed arrays)', function () {
      const schemaOne = new SimpleSchema({
        itemRef: Object,
        'itemRef.inner': Number,
      });
      const schemaTwo = new SimpleSchema({
        itemRef: Object,
        'itemRef.inner': String,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaOne, Array),
        'item.$': schemaTwo,
      });
      let isValid = combinedSchema.namedContext().validate({
        item: [{ itemRef: { inner: 'test' } }],
      });
      expect(isValid).toBe(true);
      isValid = combinedSchema.namedContext().validate({
        item: { itemRef: { inner: 2 } },
      });
      expect(isValid).toBe(true);
    });

    it('oneOfKeys returns the correct set of keys', () => {
      let schema = new SimpleSchema({
        str: String,
        obj: Object,
        'obj.inner': String,
      });

      expect(schema.oneOfKeys().size).toBe(0);
      schema = new SimpleSchema({
        str: String,
        obj: Object,
        'obj.inner': new SimpleSchema({
          thing: String,
        }),
      });

      expect(schema.oneOfKeys().size).toBe(0);
      schema = new SimpleSchema({
        str: String,
        obj: Object,
        'obj.inner': SimpleSchema.oneOf(
          new SimpleSchema({
            thing: String,
          }),
          new SimpleSchema({
            thing2: String,
          }),
        ),
      });

      expect(Array.from(schema.oneOfKeys().keys())).toEqual(['obj.inner.thing', 'obj.inner.thing2']);
      schema = new SimpleSchema({
        str: String,
        obj: Object,
        'obj.inner': SimpleSchema.oneOf(
          new SimpleSchema({
            thing: Object,
            'thing.inner': String,
          }),
          new SimpleSchema({
            thing2: Object,
            'thing2.inner': String,
          }),
        ),
      });

      expect(Array.from(schema.oneOfKeys().keys())).toEqual(['obj.inner.thing', 'obj.inner.thing.inner', 'obj.inner.thing2', 'obj.inner.thing2.inner']);
      schema = new SimpleSchema({
        str: String,
        obj: Array,
        'obj.$': SimpleSchema.oneOf(
          new SimpleSchema({
            thing: Object,
            'thing.inner': String,
          }),
          new SimpleSchema({
            thing2: Object,
            'thing2.inner': String,
          }),
        ),
      });

      expect(Array.from(schema.oneOfKeys().keys())).toEqual(['obj.$.thing', 'obj.$.thing.inner', 'obj.$.thing2', 'obj.$.thing2.inner']);
    });

    it('allows simple types (modifier)', function () {
      const schema = new SimpleSchema({
        field: SimpleSchema.oneOf(String, Number),
      });

      let isValid = schema.namedContext().validate({
        $set: {
          field: 'test',
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = schema.namedContext().validate({
        $set: {
          field: 3,
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = schema.namedContext().validate({
        $set: {
          field: false,
        },
      }, { modifier: true });
      expect(isValid).toBe(false);
    });

    it('allows either type including schemas (array nested differing types - modifier)', function () {
      // this test case is to ensure we correctly use a new "root" schema for nested objects
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
        obj: Object,
        'obj.inner': String,
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
        obj: Object,
        'obj.inner': Number,
      });

      const combinedSchema = new SimpleSchema({
        item: Array,
        'item.$': SimpleSchema.oneOf(schemaOne, schemaTwo),
      });
      let isValid = combinedSchema.namedContext().validate({
        $push: {
          item: {
            itemRef: 'test',
            partNo: 'test',
            obj: {
              inner: 'test',
            },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $push: {
          item: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj: {
              inner: 3,
            },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $push: {
          item: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj: {
              inner: false,
            },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(false);

      isValid = combinedSchema.namedContext().validate({
        $push: {
          item: {
            $each: [
              {
                anotherIdentifier: 'test',
                partNo: 'test',
                obj: {
                  inner: 3,
                },
              },
              {
                itemRef: 'test',
                partNo: 'test',
                obj: {
                  inner: 'test',
                },
              },
            ],
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.0.obj.inner': 'test',
        },
      }, { modifier: true });
      expect(isValid).toBe(true);
    });

    it('allows either type including schemas (nested differing types - modifier)', function () {
      // this test case is to ensure we correctly use a new "root" schema for nested objects
      const schemaTwo = new SimpleSchema({
        itemRef: String,
        partNo: String,
        obj: Object,
        'obj.inner': String,
      });

      const schemaOne = new SimpleSchema({
        anotherIdentifier: String,
        partNo: String,
        obj: Object,
        'obj.inner': Number,
      });

      const combinedSchema = new SimpleSchema({
        item: SimpleSchema.oneOf(schemaOne, schemaTwo),
      });
      let isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj.inner': 'test',
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj.inner': 3,
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj.inner': false,
        },
      }, { modifier: true });
      expect(isValid).toBe(false);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj': { inner: 'test' },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj': { inner: 3 },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          'item.obj': { inner: false },
        },
      }, { modifier: true });
      expect(isValid).toBe(false);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          item: {
            itemRef: 'test',
            partNo: 'test',
            obj: { inner: 'test' },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          item: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj: { inner: 3 },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(true);

      isValid = combinedSchema.namedContext().validate({
        $set: {
          item: {
            anotherIdentifier: 'test',
            partNo: 'test',
            obj: { inner: 'test' },
          },
        },
      }, { modifier: true });
      expect(isValid).toBe(false);
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

    it('works when one is an array', function () {
      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, Array),
        'foo.$': String,
      });

      expect(function () {
        schema.validate({
          foo: 'bar',
        });
      }).toNotThrow();

      expect(function () {
        schema.validate({
          foo: 1,
        });
      }).toThrow();

      expect(function () {
        schema.validate({
          foo: [],
        });
      }).toNotThrow();

      expect(function () {
        schema.validate({
          foo: ['bar', 'bin'],
        });
      }).toNotThrow();

      expect(function () {
        schema.validate({
          foo: ['bar', 1],
        });
      }).toThrow();
    });

    it('works when one is a schema', function () {
      const objSchema = new SimpleSchema({
        _id: String,
      });

      const schema = new SimpleSchema({
        foo: SimpleSchema.oneOf(String, objSchema),
      });

      expect(function () {
        schema.validate({
          foo: 'bar',
        });
      }).toNotThrow();

      expect(function () {
        schema.validate({
          foo: 1,
        });
      }).toThrow();

      expect(function () {
        schema.validate({
          foo: [],
        });
      }).toThrow();

      expect(function () {
        schema.validate({
          foo: {},
        });
      }).toThrow();

      expect(function () {
        schema.validate({
          foo: {
            _id: 'ID',
          },
        });
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
