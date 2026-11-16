import { Server } from "socket.io";
import { config } from "../config.js";
import { findActiveUser } from "../modules/auth/auth.service.js";
import { readCookie, verifySession } from "../modules/auth/tokens.js";
import {
  events,
  ORDER_CHANGED,
  PRICES_CHANGED,
  REQUEST_CHANGED,
  USER_DISABLED,
} from "./events.js";

const ADMINS = "admins";
const EVERYONE = "everyone";
const userRoom = (id) => `user:${id}`;

/**
 * Socket.IO server. Only signed-in users may connect, and each connection joins
 * the rooms its role is allowed to hear:
 *
 *   everyone        prices:changed   { products, feed }
 *   admins          orders:changed   { side, action, id }
 *                   request:changed  { action, request }   (all customers' requests)
 *   user:<id>       request:changed  { action, request }   (only the owner's own)
 */
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: config.corsOrigins.length
      ? { origin: config.corsOrigins, credentials: true }
      : undefined,
  });

  io.use(async (socket, next) => {
    try {
      const { headers, auth } = socket.handshake;
      const session = verifySession(
        auth?.token ?? readCookie(headers.cookie, config.authCookieName),
      );
      const user = session && (await findActiveUser(session.id));
      if (!user) return next(new Error("unauthorized"));
      socket.data.user = user;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user;
    socket.join(EVERYONE);
    socket.join(role === "admin" ? ADMINS : userRoom(id));
  });

  const onOrder = (payload) => io.to(ADMINS).emit("orders:changed", payload);
  const onPrices = (payload) => io.to(EVERYONE).emit("prices:changed", payload);
  const onRequest = ({ action, userId, forAdmin, forCustomer }) => {
    io.to(ADMINS).emit("request:changed", { action, request: forAdmin });
    io.to(userRoom(userId)).emit("request:changed", { action, request: forCustomer });
  };
  const onDisabled = ({ userId }) => io.in(userRoom(userId)).disconnectSockets(true);

  events.on(ORDER_CHANGED, onOrder);
  events.on(PRICES_CHANGED, onPrices);
  events.on(REQUEST_CHANGED, onRequest);
  events.on(USER_DISABLED, onDisabled);

  io.engine.on("close", () => {
    events.off(ORDER_CHANGED, onOrder);
    events.off(PRICES_CHANGED, onPrices);
    events.off(REQUEST_CHANGED, onRequest);
    events.off(USER_DISABLED, onDisabled);
  });
  return io;
}
