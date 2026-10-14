import ApiError from "../utils/ApiError.js";

const LOCATIONS = ["params", "query", "body"];

/**
 * Validates and normalises request input with zod schemas:
 *   router.post("/", validate({ body: createSchema }), handler)
 * Unknown fields are stripped, strings are trimmed/coerced by the schemas, and
 * every problem is reported at once as a 400 VALIDATION_ERROR.
 */
const validate = (schemas) => (req, _res, next) => {
  const details = [];
  const parsed = {};

  for (const location of LOCATIONS) {
    const schema = schemas[location];
    if (!schema) continue;
    const result = schema.safeParse(req[location] ?? {});
    if (result.success) {
      parsed[location] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ location, field: issue.path.join(".") || location, message: issue.message });
      }
    }
  }

  if (details.length) {
    return next(ApiError.badRequest("Some fields are invalid", details, "VALIDATION_ERROR"));
  }

  if (parsed.body) req.body = parsed.body;
  if (parsed.params) req.params = { ...req.params, ...parsed.params };
  if (parsed.query) {
    // Express 5 exposes req.query through a getter, so shadow it on this request.
    Object.defineProperty(req, "query", { value: parsed.query, writable: true, configurable: true, enumerable: true });
  }
  return next();
};

export default validate;
