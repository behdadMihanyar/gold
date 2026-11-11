import { EventEmitter } from "node:events";

/**
 * In-process bus for domain events. The Socket.IO layer subscribes to it and
 * fans events out to connected dashboards.
 *
 * Single-instance deployments need nothing more. If you ever run several API
 * instances, publish these events through PostgreSQL LISTEN/NOTIFY or the
 * Socket.IO Redis adapter instead.
 */
export const events = new EventEmitter();

export const ORDER_CHANGED = "order:changed";

/** action: "INSERT" | "UPDATE" | "DELETE" (same names Supabase used). */
export function emitOrderChanged(side, action, id) {
  events.emit(ORDER_CHANGED, { side, action, id });
}
