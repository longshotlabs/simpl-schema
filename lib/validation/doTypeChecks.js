import { SimpleSchema } from '../SimpleSchema';
import doDateChecks from './doDateChecks';
import doNumberChecks from './doNumberChecks';
import doStringChecks from './doStringChecks';
import doArrayChecks from './doArrayChecks';

function doTypeChecks(def, keyValue, op) {
  const expectedType = def.type;

  if (expectedType === String) return doStringChecks(def, keyValue);
  if (expectedType === Number) return doNumberChecks(def, keyValue, op, false);
  if (expectedType === SimpleSchema.Integer) return doNumberChecks(def, keyValue, op, true);

  if (expectedType === Boolean) {
    // Is it a boolean?
    if (typeof keyValue !== 'boolean') {
      return { type: SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Boolean' };
    }
    return;
  }

  if (expectedType === Object) {
    // Is it an object?
    if (keyValue !== Object(keyValue) || keyValue instanceof Date) {
      return { type: SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: 'Object' };
    }
    return;
  }

  if (expectedType === Array) return doArrayChecks(def, keyValue);

  if (expectedType instanceof Function) {
    // Generic constructor checks
    if (!(keyValue instanceof expectedType)) return { type: SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: expectedType.name };

    // Date checks
    if (expectedType === Date) return doDateChecks(def, keyValue);
  }
}

export default doTypeChecks;
