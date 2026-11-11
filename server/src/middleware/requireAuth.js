import { config } from "../config.js";
import { verifySession } from "../modules/auth/tokens.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Accepts the session from the httpOnly cookie (browser) or an
 * `Authorization: Bearer <token>` header (scripts / other clients).
 */
export function requireAuth(req, _res, next) {
  const header = req.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const user = verifySession(bearer ?? req.cookies?.[config.authCookieName]);
  if (!user) throw HttpError.unauthorized();
  req.user = user;
  next();
}
