import { SimpleSchema } from '../SimpleSchema';

const requiredCustomSchema = new SimpleSchema({
  a: {
    type: Array,
    custom: function () {
      // Just adding custom to trigger extra validation
    }
  },
  'a.$': {
    type: Object,
    custom: function () {
      // Just adding custom to trigger extra validation
    }
  },
  b: {
    type: Array,
    custom: function () {
      // Just adding custom to trigger extra validation
    }
  },
  'b.$': {
    type: Object,
    custom: function () {
      // Just adding custom to trigger extra validation
    }
  },
});

export default requiredCustomSchema;
