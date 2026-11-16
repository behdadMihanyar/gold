import { config } from "../config.js";
import { findActiveUser } from "../modules/auth/auth.service.js";
import { verifySession } from "../modules/auth/tokens.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Accepts the session from the httpOnly cookie (browser) or an
 * `Authorization: Bearer <token>` header (scripts / other clients).
 *
 * The account (role, active flag) is loaded from the database on every request,
 * so a disabled customer is locked out immediately instead of when the token expires.
 */
export async function requireAuth(req, _res, next) {
  const header = req.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const session = verifySession(bearer ?? req.cookies?.[config.authCookieName]);
  if (!session) throw HttpError.unauthorized();

  const user = await findActiveUser(session.id);
  if (!user) throw HttpError.unauthorized();

  req.user = user;
  next();
}
