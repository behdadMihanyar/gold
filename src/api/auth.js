import { request } from "./client";

export const authApi = {
  me: () => request("/auth/me").then((r) => r.user),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }).then(
      (r) => r.user,
    ),
  signup: (email, password) =>
    request("/auth/signup", { method: "POST", body: { email, password } }).then(
      (r) => r.user,
    ),
  logout: () => request("/auth/logout", { method: "POST" }),
};
