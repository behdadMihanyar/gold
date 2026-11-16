import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, changePassword } from "./auth.service.js";
import {
  baseCookieOptions,
  sessionCookieOptions,
  signSession,
} from "./tokens.js";

// `identifier` is an email (admins) or a username (customers). `email` is still
// accepted for older clients.
const loginBody = z
  .object({
    identifier: z.string().trim().min(1).max(254).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    // Only checked for presence: existing (e.g. imported) accounts may predate the length rule.
    password: z.string().min(1).max(128),
  })
  .refine((b) => b.identifier || b.email, {
    path: ["identifier"],
    message: "Username or email is required",
  })
  .transform((b) => ({ identifier: b.identifier ?? b.email, password: b.password }));

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

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

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(config.authCookieName, baseCookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post("/password", requireAuth, authLimiter, validate(passwordBody), async (req, res) => {
  await changePassword(req.user.id, req.valid.body);
  res.status(204).end();
});
