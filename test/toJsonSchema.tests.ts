import { expect } from 'expect'

import { SimpleSchema } from '../src/SimpleSchema.js'
import { toJsonSchema } from '../src/toJsonSchema.js'
import testSchema from './helpers/testSchema.js'

it('converts a SimpleSchema instance to a JSONSchema Document', () => {
  const jsonSchema = toJsonSchema(testSchema, 'ID')
  expect(jsonSchema).toEqual({
    $id: 'ID',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties: {
      allowedNumbers: {
        type: 'integer'
      },
      allowedNumbersArray: {
        additionalItems: false,
        items: [
          {
            type: 'integer'
          }
        ],
        type: 'array'
      },
      allowedNumbersSet: {
        additionalItems: false,
        items: [
          {
            type: 'integer'
          }
        ],
        type: 'array'
      },
      allowedStrings: {
        type: 'string',
        enum: [
          'tuna',
          'fish',
          'salad'
        ]
      },
      allowedStringsArray: {
        additionalItems: false,
        items: [
          {
            type: 'string',
            enum: [
              'tuna',
              'fish',
              'salad'
            ]
          }
        ],
        type: 'array'
      },
      allowedStringsSet: {
        additionalItems: false,
        items: [
          {
            type: 'string',
            enum: [
              'tuna',
              'fish',
              'salad'
            ]
          }
        ],
        type: 'array'
      },
      blackBoxObject: {
        additionalProperties: true,
        properties: {},
        required: [],
        type: 'object'
      },
      boolean: {
        type: 'boolean'
      },
      booleanArray: {
        additionalItems: false,
        items: [
          {
            type: 'boolean'
          }
        ],
        type: 'array'
      },
      customObject: {
        additionalProperties: true,
        properties: {},
        required: [],
        type: 'object'
      },
      date: {
        format: 'date-time',
        type: 'string'
      },
      dateArray: {
        additionalItems: false,
        items: [
          {
            format: 'date-time',
            type: 'string'
          }
        ],
        type: 'array'
      },
      decimal: {
        type: 'number'
      },
      email: {
        type: 'string',
        pattern: '/bar/'
      },
      maxZero: {
        type: 'integer',
        maximum: 0
      },
      minMaxDate: {
        format: 'date-time',
        type: 'string'
      },
      minMaxDateCalculated: {
        format: 'date-time',
        type: 'string'
      },
      minMaxNumber: {
        type: 'integer',
        maximum: 20,
        minimum: 10
      },
      minMaxNumberCalculated: {
        type: 'integer'
      },
      minMaxNumberExclusive: {
        type: 'integer',
        exclusiveMaximum: 20,
        exclusiveMinimum: 10
      },
      minMaxNumberInclusive: {
        type: 'integer',
        maximum: 20,
        minimum: 10
      },
      minMaxString: {
        type: 'string',
        maxLength: 20,
        minLength: 10,
        pattern: '/^[a-z0-9_]+$/'
      },
      minMaxStringArray: {
        additionalItems: false,
        items: [
          {
            type: 'string',
            maxLength: 20,
            minLength: 10
          }
        ],
        type: 'array'
      },
      minZero: {
        type: 'integer',
        minimum: 0
      },
      number: {
        type: 'integer'
      },
      objectArray: {
        additionalItems: false,
        items: [
          {
            additionalProperties: false,
            properties: {},
            required: [],
            type: 'object'
          }
        ],
        type: 'array'
      },
      refObject: {
        additionalProperties: false,
        properties: {
          number: {
            type: 'number'
          },
          string: {
            type: 'string'
          }
        },
        required: [],
        type: 'object'
      },
      refSchemaArray: {
        additionalItems: false,
        items: [
          {
            additionalProperties: false,
            properties: {
              number: {
                type: 'number'
              },
              string: {
                type: 'string'
              }
            },
            required: [],
            type: 'object'
          }
        ],
        type: 'array'
      },
      string: {
        type: 'string'
      },
      sub: {
        additionalProperties: false,
        properties: {
          number: {
            type: 'integer'
          }
        },
        required: [],
        type: 'object'
      },
      url: {
        type: 'string'
      }
    },
    required: []
  })
})

it('converts oneOf to anyOf', () => {
  const schemaOne = new SimpleSchema({
    itemRef: String,
    partNo: String
  })

  const schemaTwo = new SimpleSchema({
    anotherIdentifier: String,
    partNo: String
  })

  const combinedSchema = new SimpleSchema({
    item: SimpleSchema.oneOf(String, schemaOne, schemaTwo)
  })

  const jsonSchema = toJsonSchema(combinedSchema)
  expect(jsonSchema).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties: {
      item: {
        anyOf: [
          {
            type: 'string'
          },
          {
            additionalProperties: false,
            properties: {
              itemRef: {
                type: 'string'
              },
              partNo: {
                type: 'string'
              }
            },
            required: [
              'itemRef',
              'partNo'
            ],
            type: 'object'
          },
          {
            additionalProperties: false,
            properties: {
              anotherIdentifier: {
                type: 'string'
              },
              partNo: {
                type: 'string'
              }
            },
            required: [
              'anotherIdentifier',
              'partNo'
            ],
            type: 'object'
          }
        ]
      }
    },
    required: [
      'item'
    ]
  })
})
