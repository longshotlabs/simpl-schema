import { SimpleSchema } from '../SimpleSchema';

const passwordSchema = new SimpleSchema({
  password: {
    type: String
  },
  confirmPassword: {
    type: String,
    custom: function () {
      if (this.value !== this.field('password').value) {
        return "passwordMismatch";
      }
    }
  }
});

export default passwordSchema;
