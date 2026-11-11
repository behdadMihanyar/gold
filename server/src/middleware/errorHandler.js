import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(req, _res, next) {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) },
    });
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Invalid JSON body" } });
  }

  // PostgreSQL constraint violations → client errors
  if (err.code === "23505") {
    return res.status(409).json({ error: { message: "Duplicate value" } });
  }
  if (err.code === "23514" || err.code === "22P02") {
    return res.status(400).json({ error: { message: "Invalid value" } });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ error: { message: "Internal server error" } });
}
