// Thin fetch wrapper for the Gold API. Authentication rides on an httpOnly
// session cookie, so no token handling is needed in the browser.

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const UNAUTHORIZED_EVENT = "api:unauthorized";

export async function request(path, { method = "GET", body, query, signal } = {}) {
  const url = new URL(`${API_URL}/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    method,
    signal,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(
      res.status,
      payload?.error?.message ?? res.statusText,
      payload?.error?.details,
    );
  }
  return payload;
}
