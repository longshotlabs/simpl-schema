# simple-schema

IMPORTANT: WORK IN PROGRESS! DO NOT USE!

## Quick Start

### Validate an Object and Throw an Error

```js
import SimpleSchema from 'simple-schema';

new SimpleSchema({
  name: String,
}).validate({
  name: 2,
});
```

### Validate an Array of Objects and Throw an Error

An error is thrown for the first invalid object found.

```js
import SimpleSchema from 'simple-schema';

new SimpleSchema({
  name: String,
}).validate([
  { name: 'Bill' },
  { name: 2 },
]);
```

### Validate an Object and Get the Errors

```js
import SimpleSchema from 'simple-schema';

const validationContext = new SimpleSchema({
  name: String,
}).newContext();

validationContext.validate({
  name: 2,
});

console.log(validationContext.isValid());
console.log(validationContext.validationErrors());
```

### Validate a MongoDB Modifier

```js
import SimpleSchema from 'simple-schema';

const validationContext = new SimpleSchema({
  name: String,
}).newContext();

validationContext.validate({
  $set: {
    name: 2,
  },
}, { modifier: true });

console.log(validationContext.isValid());
console.log(validationContext.validationErrors());
```

### Enable Meteor Tracker Reactivity

```js
import SimpleSchema from 'simple-schema';
import { Tracker } from 'meteor/tracker';

const validationContext = new SimpleSchema({
  name: String,
}, { tracker: Tracker }).newContext();

Tracker.autorun(function () {
  console.log(validationContext.isValid());
  console.log(validationContext.validationErrors());
});

validationContext.validate({
  name: 2,
});

validationContext.validate({
  name: 'Joe',
});
```

### Automatically Clean the Object Before Validating It

```js
import SimpleSchema from 'simple-schema';

const mySchema = new SimpleSchema({
  name: String,
}, {
  clean: {
    filter: true,
    autoConvert: true,
    removeEmptyStrings: true,
    trimStrings: true,
    getAutoValues: true,
    removeNullsFromArrays: true,
  },
});
```

### Explicitly Clean an Object

```js
const mySchema = new SimpleSchema({ name: String });
const doc = { name: 123 };
mySchema.clean(doc);
// doc is now mutated to hopefully have a better chance of passing validation
console.log(typeof doc.name); // string
```

Works for a MongoDB modifier, too:

```js
const mySchema = new SimpleSchema({ name: String });
const modifier = { $set: { name: 123 } };
mySchema.clean(modifier);
// doc is now mutated to hopefully have a better chance of passing validation
console.log(typeof doc.$set.name); // string
```

### Customize the Error That is Thrown

```js
SimpleSchema.defineValidationErrorTransform(error => {
  const customError = new MyCustomErrorType(error.message);
  customError.errorList = error.details;
  return customError;
});
```

### Custom Whole-Document Validators

Add a validator for all schemas:

```js
SimpleSchema.addDocValidator(obj => {
  // Must return an array, potentially empty, of objects with `name` and `type` string properties and optional `value` property.
  return [
    { name: 'firstName', type: 'TOO_SILLY', value: 'Reepicheep' }
  ];
});
```

Add a validator for one schema:

```js
const schema = new SimpleSchema({ ... });
schema.addDocValidator(obj => {
  // Must return an array, potentially empty, of objects with `name` and `type` string properties and optional `value` property.
  return [
    { name: 'firstName', type: 'TOO_SILLY', value: 'Reepicheep' }
  ];
});
```
