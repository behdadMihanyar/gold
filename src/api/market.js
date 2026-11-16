import { request } from "./client";

export const marketApi = {
  board: () => request("/products"),
};

export const requestsApi = {
  list: (query) => request("/requests", { query }),
  create: (body) => request("/requests", { method: "POST", body }).then((r) => r.data),
  cancel: (id) => request(`/requests/${id}/cancel`, { method: "POST" }).then((r) => r.data),
  unseen: () => request("/requests/unseen").then((r) => r.data),
  markSeen: (ids) => request("/requests/seen", { method: "POST", body: { ids } }),
};

export const adminApi = {
  requests: (query) => request("/admin/requests", { query }),
  summary: () => request("/admin/requests/summary").then((r) => r.data),
  accept: (id, body) =>
    request(`/admin/requests/${id}/accept`, { method: "POST", body }).then((r) => r.data),
  reject: (id, body) =>
    request(`/admin/requests/${id}/reject`, { method: "POST", body }).then((r) => r.data),
  customers: (query) => request("/admin/customers", { query }),
  addCustomer: (body) => request("/admin/customers", { method: "POST", body }).then((r) => r.data),
  updateCustomer: (id, body) =>
    request(`/admin/customers/${id}`, { method: "PATCH", body }).then((r) => r.data),
  updateProduct: (id, body) =>
    request(`/admin/products/${id}`, { method: "PATCH", body }).then((r) => r.data),
};
