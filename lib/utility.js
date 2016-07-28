function appendAffectedKey(affectedKey, key) {
  if (key === '$each') return affectedKey;
  return affectedKey ? `${affectedKey}.${key}` : key;
}

function dateToDateString(date) {
  let m = (date.getUTCMonth() + 1);
  if (m < 10) m = `0${m}`;
  let d = date.getUTCDate();
  if (d < 10) d = `0${d}`;
  return `${date.getUTCFullYear()}-${m}-${d}`;
}

function isObjectWeShouldTraverse(val) {
  if (val !== Object(val)) return false;

  // There are some object types that we know we shouldn't traverse because
  // they will often result in overflows and it makes no sense to validate them.
  if (val instanceof Date) return false;
  if (val instanceof Int8Array) return false;
  if (val instanceof Uint8Array) return false;
  if (val instanceof Uint8ClampedArray) return false;
  if (val instanceof Int16Array) return false;
  if (val instanceof Uint16Array) return false;
  if (val instanceof Int32Array) return false;
  if (val instanceof Uint32Array) return false;
  if (val instanceof Float32Array) return false;
  if (val instanceof Float64Array) return false;

  return true;
}

function looksLikeModifier(obj) {
  return !!Object.keys(obj || {}).find(key => key.substring(0, 1) === '$');
}

export {
  appendAffectedKey,
  dateToDateString,
  isObjectWeShouldTraverse,
  looksLikeModifier,
};
