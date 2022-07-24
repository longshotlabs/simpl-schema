/**
 * Returns true if any of the keys of obj start with a $
 */
export default function looksLikeModifier (
  obj: Record<string | number | symbol, unknown>
) {
  return !!Object.keys(obj || {}).find((key) => key.substring(0, 1) === '$')
}
