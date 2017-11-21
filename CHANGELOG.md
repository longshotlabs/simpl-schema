<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [simpl-schema CHANGELOG](#simpl-schema-changelog)
  - [1.1.0](#110)
  - [1.0.0](#100)
  - [0.5.0](#050)
  - [0.4.2](#042)
  - [0.4.1](#041)
  - [0.4.0](#040)
  - [0.3.2](#032)
  - [0.3.1](#031)
  - [0.3.0](#030)
  - [0.2.3](#023)
  - [0.2.2](#022)
  - [0.2.1](#021)
  - [0.2.0](#020)
  - [0.1.1](#011)
  - [0.1.0](#010)
  - [0.0.4](#004)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# simpl-schema CHANGELOG

## 1.1.0

- The `autoConvert` cleaning now converts strings that are "true" or "false" to Boolean if the schema expects a Boolean.
- The `autoConvert` cleaning now converts numbers to Boolean if the schema expects a Boolean, with 0 being `false` and all other numbers being `true`.

## 1.0.0

*BREAKING CHANGE:* autoValue and defaultValue handling has been rewritten to fix all known issues. As part of this rewrite, the behavior has changed to address a point of common confusion.

Previously, when you cleaned an object to add autoValues, a `defaultValue` would be added (and an `autoValue` function would run) even if the parent object was not present. (It would be created.)

Now, an `autoValue`/`defaultValue` will run only if the object in which it appears exists. Usually this is what you want, but if you are relying on the previous behavior, you can achieve the same thing by making sure that all ancestor objects have a `defaultValue: {}`.

For example, this:

```js
{
  profile: {
    type: Object,
    optional: true,
  },
  'profile.language': {
    type: String,
    defaultValue: 'en',
  },
}
```

previously cleaned `{}` to become `{ profile: { language: 'en' } }` but now would remain `{}`. If you want cleaning to result in `{ profile: { language: 'en' } }`, add the `profile` default value like:

```js
{
  profile: {
    type: Object,
    optional: true,
    defaultValue: {},
  },
  'profile.language': {
    type: String,
    defaultValue: 'en',
  },
}
```

If `profile` were nested under another object, you'd have to add `defaultValue: {}` to that object definition, too, and so on.

- Fix regression that resulted in `_constructorOptions key is missing "type"` error reappearing in some situations
- Fix errors when validating an object that has a property named `length`

## 0.5.0

- Remove underscore dependency in favor of seperated lodash modules

## 0.4.2

- Fix to properly add defaultValues in objects that are being $pushed in an update modifier
- Fix removeNullsFromArrays to remove only nulls

## 0.4.1

Fix cleaning an object with a `length` property

## 0.4.0

- Added `getFormValidator()`, similar to `validator()` but instead of throwing an error, it returns a Promise that resolves with the errors. This can be used as a [Composable Form Specification validator](http://forms.dairystatedesigns.com/user/validation/).
- Throw a better error when keys that conflict with Object prototype keys are used (Thanks @xavierpriour)
- Fix the incorrect "Found both autoValue and defaultValue options" warning (Thanks @SachaG)

## 0.3.2

Bump dependencies to fix `messages` issues

## 0.3.1

- When calling `pick` or `omit`, the `messageBox` and all original `SimpleSchema` constructor options are now properly kept. (Thanks @plumpudding)
- Fixed #80 (Thanks @jasonphillips)
- `getQuickTypeForKey` may now return additional strings "object" or "objectArray"
- Fix erroneous "Found both autoValue and defaultValue" warning (Thanks @SachaG)
- Fix passing of clean options when extending
- Other fixes to extending logic

## 0.3.0

- Added human-friendly `message` to each validation error in the `details` array on a thrown ClientError (thanks @unknown4unnamed)
- Fixed isInteger error on IE11 (thanks @lmachens)
- Switched to duck typing for `SimpleSchema` instanceof checks to fix failures due to multiple instances of the package (thanks @dpankros)
- Fixed multiple calls to `messages` for different schemas from affecting the other schemas (thanks @Josh-ES)

## 0.2.3

- Add missing deep-extend dependency

## 0.2.2

- Fixed Meteor Tracker reactivity

## 0.2.1

- It is no longer considered a validation error when a key within $unset is not defined in the schema.

## 0.2.0

- Added `ssInstance.getQuickTypeForKey(key)`
- Added `ssInstance.getObjectSchema(key)`

## 0.1.1

- Improved error for missing `type` property
- Use _.contains instead of Array.includes to fix some compatibility issues (thanks @DerekTBrown)
- Various documentation and test fixes

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
