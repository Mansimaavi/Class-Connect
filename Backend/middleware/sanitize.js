/**
 * Defence-in-depth against NoSQL operator injection: drops any key that starts
 * with "$" or contains "." from the body, query string and route params before
 * they can reach a Mongo query (e.g. `{ "email": { "$ne": null } }`).
 */
const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

export const stripOperators = (value, depth = 0) => {
  if (depth > 20) return undefined;
  if (Array.isArray(value)) return value.map((item) => stripOperators(item, depth + 1));
  if (!isPlainObject(value)) return value;

  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".") || key === "__proto__" || key === "constructor") continue;
    clean[key] = stripOperators(child, depth + 1);
  }
  return clean;
};

const sanitize = (req, _res, next) => {
  if (req.body && typeof req.body === "object") req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params);

  const query = req.query;
  if (query && Object.keys(query).length) {
    Object.defineProperty(req, "query", {
      value: stripOperators(query),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
};

export default sanitize;
