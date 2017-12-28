import { SimpleSchema } from '../SimpleSchema';
import includes from 'lodash.includes';

export default function allowedValuesValidator() {
  if (!this.valueShouldBeChecked) return;

  const allowedValues = this.definition.allowedValues;
  if (!allowedValues) return;

  const isAllowed = includes(allowedValues, this.value);
  return isAllowed ? true : SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}
