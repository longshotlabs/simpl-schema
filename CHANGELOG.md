# simpl-schema CHANGELOG

## 0.1.0

- Added `ssInstance.getAllowedValuesForKey(key)`

## 0.0.4

- Removed the `babel-polyfill` dependency. It may not cause problems, but to be safe you'll want to be sure that your app depends on and imports `babel-polyfill` or some other ES2015 polyfill package.
- `this.validationContext` is now available in all custom validator functions (thanks @yanickrochon)
- You can now call `SimpleSchema.setDefaultMessages(messages)`, passing in the same object you would pass to the `MessageBox` constructor, if you want to override the default messages for all schemas. This is in addition to being able to set `schema.messageBox` to your own custom `MessageBox` instance for a single schema, which you could already do. (thanks @clayne11)
- Labels with certain characters like single quotes will now show up correctly in validation error messages. (thanks @clayne11)
- `extend` is now chainable
- Requiredness validation now works for required fields that are in subschemas
- Fixed some issues with autoValues not being correctly added when they were deeply nested under several levels of arrays and objects.
