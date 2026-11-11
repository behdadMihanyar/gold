import { HttpError } from "../utils/httpError.js";

/**
 * Validate part of the request against a zod schema. The parsed (coerced,
 * stripped) value is stored on req.valid[source] — Express 5's req.query is
 * read-only, so we never write back to the original objects.
 */
export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw HttpError.badRequest("Validation failed", details);
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
