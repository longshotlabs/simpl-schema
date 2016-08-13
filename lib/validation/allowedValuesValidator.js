import { SimpleSchema } from '../SimpleSchema';

function allowedValuesValidator() {
  if (!this.valueShouldBeChecked) return;

  const allowedValues = this.definition.allowedValues;
  if (!allowedValues) return;

  const isAllowed = Array.includes(allowedValues, this.value);
  return isAllowed ? true : SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}

export default allowedValuesValidator;
