/**
 * Returns an array of keys that are in obj, have a value
 * other than null or undefined, and start with matchKey
 * plus a dot.
 */
export default function getKeysWithValueInObj (
  obj: Record<string, unknown>,
  matchKey: string
) {
  const keysWithValue: string[] = []

  const keyAdjust = (key: string) => key.slice(0, matchKey.length + 1)
  const matchKeyPlusDot = `${matchKey}.`

  Object.keys(obj || {}).forEach((key) => {
    const val = obj[key]
    if (val === undefined || val === null) return
    if (keyAdjust(key) === matchKeyPlusDot) {
      keysWithValue.push(key)
    }
  })

  return keysWithValue
}
