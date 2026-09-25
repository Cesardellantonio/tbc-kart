// Tiny validators for what arrives off the network: each check is (value) => boolean, and they
// compose into message shapes. Strict on purpose — a message from a peer is untrusted input, so
// every number must be finite and in range, every array the right length, and objects may carry
// only the keys their shape names (a stray key is a malformed message, not a feature).

export const num = (lo, hi) => (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export const int = (lo, hi) => (v) => Number.isInteger(v) && v >= lo && v <= hi;
export const bool = (v) => typeof v === 'boolean';
export const oneOf = (values) => (v) => values.includes(v);
export const nullable = (check) => (v) => v === null || check(v);
export const optional = (check) => (v) => v === undefined || check(v);

// A string of at most max code points that matches re (when given).
export const str =
  (max, re = null) =>
  (v) =>
    typeof v === 'string' && [...v].length <= max && (!re || re.test(v));

// An array of exactly n items / of at most max items, every one passing check.
export const tuple = (check, n) => (v) => Array.isArray(v) && v.length === n && v.every(check);
export const list =
  (check, max, min = 0) =>
  (v) =>
    Array.isArray(v) && v.length >= min && v.length <= max && v.every(check);

const isPlain = (v) =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;

// An object with exactly these fields (optional ones may be absent) and no others.
export const shape = (fields) => {
  const keys = Object.keys(fields);
  return (v) =>
    isPlain(v) &&
    Object.keys(v).every((k) => keys.includes(k)) &&
    keys.every((k) => fields[k](v[k]));
};
