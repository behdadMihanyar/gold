import { request } from "./client";

export const authApi = {
  me: () => request("/auth/me").then((r) => r.user),
  // `identifier` is an email (admins) or a username (customers).
  login: (identifier, password) =>
    request("/auth/login", { method: "POST", body: { identifier, password } }).then(
      (r) => r.user,
    ),
  logout: () => request("/auth/logout", { method: "POST" }),
};
