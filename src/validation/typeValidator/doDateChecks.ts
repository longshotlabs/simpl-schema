import { SimpleSchema } from "../../SimpleSchema.js";
import { SchemaKeyDefinition } from "../../types.js";
import { dateToDateString } from "../../utility/index.js";

export default function doDateChecks(def: SchemaKeyDefinition, keyValue: Date) {
  // Is it an invalid date?
  if (isNaN(keyValue.getTime()))
    return { type: SimpleSchema.ErrorTypes.BAD_DATE };

  // Is it earlier than the minimum date?
  if (
    def.min &&
    typeof (def.min as Date).getTime === "function" &&
    (def.min as Date).getTime() > keyValue.getTime()
  ) {
    return {
      type: SimpleSchema.ErrorTypes.MIN_DATE,
      min: dateToDateString(def.min as Date),
    };
  }

  // Is it later than the maximum date?
  if (
    def.max &&
    typeof (def.max as Date).getTime === "function" &&
    (def.max as Date).getTime() < keyValue.getTime()
  ) {
    return {
      type: SimpleSchema.ErrorTypes.MAX_DATE,
      max: dateToDateString(def.max as Date),
    };
  }
}
