import MongoObject from 'mongo-object';
import extend from 'extend';

class SimpleSchemaGroup {
  constructor(...definitions) {
    this.definitions = definitions.map(definition => {
      if (MongoObject.isBasicObject(definition)) return definition;

      if (definition instanceof RegExp) {
        return {
          type: String,
          regEx: definition,
        };
      }

      return {
        type: definition,
      };
    });
  }

  get singleType() {
    return this.definitions[0].type;
  }

  extend(otherGroup) {
    // We extend based on index being the same. No better way I can think of at the moment.
    this.definitions = this.definitions.map((def, index) => {
      const otherDef = otherGroup.definitions[index];
      if (!otherDef) return def;
      return extend(true, {}, def, otherDef);
    });
  }
}

export default SimpleSchemaGroup;
