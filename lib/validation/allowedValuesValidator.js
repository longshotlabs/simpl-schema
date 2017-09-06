import _ from 'underscore';

import { SimpleSchema } from '../SimpleSchema';

function allowedValuesValidator() {
  if (!this.valueShouldBeChecked) return;

  const allowedValues = this.definition.allowedValues;
  if (!allowedValues) return;

  const isAllowed = _.contains(allowedValues, this.value);
  return isAllowed ? true : SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED;
}

export default allowedValuesValidator;
