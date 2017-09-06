'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function appendAffectedKey(affectedKey, key) {
  if (key === '$each') return affectedKey;
  return affectedKey ? affectedKey + '.' + key : key;
}

function dateToDateString(date) {
  var m = date.getUTCMonth() + 1;
  if (m < 10) m = '0' + m;
  var d = date.getUTCDate();
  if (d < 10) d = '0' + d;
  return date.getUTCFullYear() + '-' + m + '-' + d;
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
  return !!Object.keys(obj || {}).find(function (key) {
    return key.substring(0, 1) === '$';
  });
}

/**
 * Run loopFunc for each ancestor key in a dot-delimited key. For example,
 * if key is "a.b.c", loopFunc will be called first with ('a.b', 'c') and then with ('a', 'b.c')
 */
function forEachKeyAncestor(key, loopFunc) {
  var lastDot = void 0;

  // Iterate the dot-syntax hierarchy
  var ancestor = key;
  do {
    lastDot = ancestor.lastIndexOf('.');
    if (lastDot !== -1) {
      ancestor = ancestor.slice(0, lastDot);
      var remainder = key.slice(ancestor.length + 1);
      loopFunc(ancestor, remainder); // Remove last path component
    }
  } while (lastDot !== -1);
}

/**
 * Returns the parent of a key. For example, returns 'a.b' when passed 'a.b.c'.
 * If no parent, returns an empty string. If withEndDot is true, the return
 * value will have a dot appended when it isn't an empty string.
 */
function getParentOfKey(key, withEndDot) {
  var lastDot = key.lastIndexOf('.');
  return lastDot === -1 ? '' : key.slice(0, lastDot + Number(!!withEndDot));
}

exports.appendAffectedKey = appendAffectedKey;
exports.dateToDateString = dateToDateString;
exports.isObjectWeShouldTraverse = isObjectWeShouldTraverse;
exports.looksLikeModifier = looksLikeModifier;
exports.forEachKeyAncestor = forEachKeyAncestor;
exports.getParentOfKey = getParentOfKey;