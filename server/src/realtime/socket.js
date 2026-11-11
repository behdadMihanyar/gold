import { Server } from "socket.io";
import { config } from "../config.js";
import { readCookie, verifySession } from "../modules/auth/tokens.js";
import { events, ORDER_CHANGED } from "./events.js";

/**
 * Socket.IO server. Only authenticated dashboards may connect; they receive
 * `orders:changed` events ({ side, action, id }) after every write.
 */
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: config.corsOrigins.length
      ? { origin: config.corsOrigins, credentials: true }
      : undefined,
  });

  io.use((socket, next) => {
    const { headers, auth } = socket.handshake;
    const token =
      auth?.token ?? readCookie(headers.cookie, config.authCookieName);
    const user = verifySession(token);
    if (!user) return next(new Error("unauthorized"));
    socket.data.user = user;
    next();
  });

  const forward = (payload) => io.emit("orders:changed", payload);
  events.on(ORDER_CHANGED, forward);

  io.engine.on("close", () => events.off(ORDER_CHANGED, forward));
  return io;
}
