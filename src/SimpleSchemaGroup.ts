import MongoObject from 'mongo-object'

import { SchemaKeyTypeDefinition, SchemaKeyTypeDefinitionWithShorthand, SupportedTypes } from './types.js'

class SimpleSchemaGroup {
  public definitions: SchemaKeyTypeDefinition[] = []

  constructor (...definitions: SchemaKeyTypeDefinitionWithShorthand[]) {
    this.definitions = definitions.map((definition) => {
      if (MongoObject.isBasicObject(definition)) {
        return { ...definition as SchemaKeyTypeDefinition }
      }

      if (definition instanceof RegExp) {
        return {
          type: String,
          regEx: definition
        }
      }

      return { type: definition as SupportedTypes }
    })
  }

  get singleType (): SupportedTypes {
    return this.definitions[0].type
  }

  clone (): SimpleSchemaGroup {
    return new SimpleSchemaGroup(...this.definitions)
  }

  extend (otherGroup: SimpleSchemaGroup): void {
    // We extend based on index being the same. No better way I can think of at the moment.
    this.definitions = this.definitions.map((def, index) => {
      const otherDef = otherGroup.definitions[index]
      if (otherDef === undefined) return def
      return { ...def, ...otherDef }
    })
  }
}

export default SimpleSchemaGroup
