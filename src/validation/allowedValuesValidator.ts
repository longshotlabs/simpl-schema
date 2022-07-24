import { SimpleSchema } from "../SimpleSchema.js";
import { ValidatorContext } from "../types.js";

export default function allowedValuesValidator(this: ValidatorContext) {
  if (!this.valueShouldBeChecked) return;

  const { allowedValues } = this.definition;
  if (!allowedValues) return;

  let isAllowed;
  // set defined in scope and allowedValues is its instance
  if (typeof Set === "function" && allowedValues instanceof Set) {
    isAllowed = allowedValues.has(this.value);
  } else {
    isAllowed = allowedValues.includes(this.value);
  }

  return isAllowed ? true : SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}
