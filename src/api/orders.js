import { formatAmount, formatPrice, toPersianDigits } from "../utils/format";
import { request } from "./client";

/**
 * The API speaks plain numbers and Latin-digit dates; the UI shows formatted
 * strings. These two adapters are the only place that conversion happens.
 */
export const fromApi = (order) => ({
  ...order,
  price: formatPrice(order.price),
  total: formatAmount(order.total),
  date: toPersianDigits(order.date),
});

const WRITABLE = [
  "name",
  "quantity",
  "price",
  "date",
  "delivery",
  "description",
  "status",
  "accounting",
];

/** Keep only writable fields. `total` is always computed by the server. */
export const toApi = (form) =>
  Object.fromEntries(
    WRITABLE.filter((key) => form[key] !== undefined).map((key) => [key, form[key]]),
  );

export const ordersApi = {
  /** → { data, total, page, pageSize } */
  list: async (side, { page = 1, pageSize = 20, date, q } = {}) => {
    const res = await request(`/orders/${side}`, {
      query: { page, pageSize, date, q },
    });
    return { ...res, data: res.data.map(fromApi) };
  },
  /** → { count, quantity, amount } */
  summary: (side, { date } = {}) =>
    request(`/orders/${side}/summary`, { query: { date } }),
  create: (side, form) =>
    request(`/orders/${side}`, { method: "POST", body: toApi(form) }).then(fromApi),
  update: (side, id, form) =>
    request(`/orders/${side}/${id}`, { method: "PATCH", body: toApi(form) }).then(
      fromApi,
    ),
  remove: (side, id) => request(`/orders/${side}/${id}`, { method: "DELETE" }),
};
