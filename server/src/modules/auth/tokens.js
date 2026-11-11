import jwt from "jsonwebtoken";
import { config } from "../../config.js";

export function signSession(user) {
  return jwt.sign({ email: user.email }, config.jwt.secret, {
    subject: user.id,
    expiresIn: config.jwt.expiresIn,
    algorithm: "HS256",
  });
}

/** Returns { id, email } or null if the token is missing/invalid/expired. */
export function verifySession(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      algorithms: ["HS256"],
    });
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export const baseCookieOptions = Object.freeze({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax",
  path: "/",
});

export function sessionCookieOptions(token) {
  const { exp } = jwt.decode(token);
  return { ...baseCookieOptions, maxAge: exp * 1000 - Date.now() };
}

/** Minimal Cookie header parser for the Socket.IO handshake. */
export function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}
