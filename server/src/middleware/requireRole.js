import { HttpError } from "../utils/httpError.js";

/** Use after requireAuth: only the listed roles may continue. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw HttpError.forbidden("Not allowed for this account");
    next();
  };
