import MongoObject from 'mongo-object';

class SimpleSchemaGroup {
  constructor(...definitions) {
    this.definitions = definitions.map((definition) => {
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
}

export default SimpleSchemaGroup;
