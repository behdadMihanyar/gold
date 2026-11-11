import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validate.js";
import { HttpError } from "../../utils/httpError.js";
import { authenticate, createUser, findUserById } from "./auth.service.js";
import {
  baseCookieOptions,
  sessionCookieOptions,
  signSession,
} from "./tokens.js";

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

// Login only checks the password is non-empty: existing (e.g. imported) accounts
// may predate the length rule.
const loginBody = credentials.extend({ password: z.string().min(1).max(128) });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { message: "Too many attempts, try again later" } },
});

function startSession(res, user) {
  const token = signSession(user);
  res.cookie(config.authCookieName, token, sessionCookieOptions(token));
  return token;
}

export const authRouter = Router();

authRouter.post("/login", authLimiter, validate(loginBody), async (req, res) => {
  const user = await authenticate(req.valid.body);
  const token = startSession(res, user);
  // The token is also returned for non-browser clients (Bearer auth).
  res.json({ user, token });
});

authRouter.post("/signup", authLimiter, validate(credentials), async (req, res) => {
  if (!config.allowSignup) throw HttpError.forbidden("Sign-up is disabled");
  const user = await createUser(req.valid.body);
  const token = startSession(res, user);
  res.status(201).json({ user, token });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.authCookieName, baseCookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) throw HttpError.unauthorized();
  res.json({ user });
});
