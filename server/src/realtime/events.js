import { EventEmitter } from "node:events";

/**
 * In-process bus for domain events. The Socket.IO layer subscribes to it and
 * fans events out to the right connected clients.
 *
 * Single-instance deployments need nothing more. If you ever run several API
 * instances, publish these events through PostgreSQL LISTEN/NOTIFY or the
 * Socket.IO Redis adapter instead.
 */
export const events = new EventEmitter();

export const ORDER_CHANGED = "order:changed";
export const PRICES_CHANGED = "prices:changed";
export const REQUEST_CHANGED = "request:changed";
export const USER_DISABLED = "user:disabled";

/** Ledger change — admins only. action: "INSERT" | "UPDATE" | "DELETE". */
export function emitOrderChanged(side, action, id) {
  events.emit(ORDER_CHANGED, { side, action, id });
}

/** Price board change — everyone signed in. `products` holds only the changed ones. */
export function emitPricesChanged(products, feed) {
  events.emit(PRICES_CHANGED, { products, feed });
}

/**
 * A buy/sell request was created or decided.
 * action: "created" | "accepted" | "rejected" | "cancelled".
 * `forAdmin` / `forCustomer` are the two views of the same request; the owner
 * only ever receives their own.
 */
export function emitRequestChanged(action, userId, { forAdmin, forCustomer }) {
  events.emit(REQUEST_CHANGED, { action, userId, forAdmin, forCustomer });
}

/** An account was disabled: drop its live connections. */
export function emitUserDisabled(userId) {
  events.emit(USER_DISABLED, { userId });
}
