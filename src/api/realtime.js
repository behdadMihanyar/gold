import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_URL } from "./client";

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(API_URL || undefined, { withCredentials: true });
  }
  return socket;
}

/** Close the shared connection (e.g. on logout). */
export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

/**
 * Subscribe to order changes pushed by the server.
 * handler receives { side: "buy" | "sell", action: "INSERT" | "UPDATE" | "DELETE", id }.
 * Pass `sides` to only hear about some sides.
 */
export function useOrdersRealtime(handler, sides = ["buy", "sell"]) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const sidesKey = sides.join(",");

  useEffect(() => {
    const s = getSocket();
    const listener = (event) => {
      if (sidesKey.split(",").includes(event.side)) handlerRef.current(event);
    };
    s.on("orders:changed", listener);
    return () => s.off("orders:changed", listener);
  }, [sidesKey]);
}
