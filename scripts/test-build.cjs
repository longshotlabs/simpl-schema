const assert = require('node:assert/strict')

function verifyEntryPoint({ default: SimpleSchema, ValidationContext, toJsonSchema }) {
  const schema = new SimpleSchema({ name: String })
  const cleaned = schema.clean({ name: ' test ' })

  assert.deepEqual(cleaned, { name: 'test' })
  assert.doesNotThrow(() => schema.validate(cleaned))
  assert.throws(() => schema.validate({ name: 42 }))
  assert.ok(schema.newContext() instanceof ValidationContext)
  assert.equal(toJsonSchema(schema).properties.name.type, 'string')
}

async function main() {
  verifyEntryPoint(require('simpl-schema'))
  verifyEntryPoint(await import('simpl-schema'))
  console.log('CommonJS and ESM entry points passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
