import { SimpleSchema } from "../../SimpleSchema.js";
import { SchemaKeyDefinition } from "../../types.js";

export default function doArrayChecks(
  def: SchemaKeyDefinition,
  keyValue: unknown
) {
  // Is it an array?
  if (!Array.isArray(keyValue)) {
    return { type: SimpleSchema.ErrorTypes.EXPECTED_TYPE, dataType: "Array" };
  }

  // Are there fewer than the minimum number of items in the array?
  if (def.minCount != null && keyValue.length < def.minCount) {
    return { type: SimpleSchema.ErrorTypes.MIN_COUNT, minCount: def.minCount };
  }

  // Are there more than the maximum number of items in the array?
  if (def.maxCount != null && keyValue.length > def.maxCount) {
    return { type: SimpleSchema.ErrorTypes.MAX_COUNT, maxCount: def.maxCount };
  }
}
