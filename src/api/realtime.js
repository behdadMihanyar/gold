import { useEffect, useRef, useState } from "react";
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

/** Subscribe to any server event (prices:changed, request:changed, ...). */
export function useSocketEvent(name, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const s = getSocket();
    const listener = (payload) => handlerRef.current(payload);
    s.on(name, listener);
    return () => s.off(name, listener);
  }, [name]);
}

/** Run `handler` whenever the socket (re)connects — refetch after a gap. */
export function useSocketReconnect(handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const s = getSocket();
    const listener = () => handlerRef.current();
    s.io.on("reconnect", listener);
    return () => s.io.off("reconnect", listener);
  }, []);
}

/**
 * false once the live connection has been down for `graceMs` (a short blip is
 * ignored), true again as soon as it is back.
 */
export function useSocketOnline(graceMs = 5000) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const s = getSocket();
    let timer = null;
    const up = () => {
      clearTimeout(timer);
      setOnline(true);
    };
    const down = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setOnline(false), graceMs);
    };
    if (!s.connected) down();
    s.on("connect", up);
    s.on("disconnect", down);
    s.on("connect_error", down);
    return () => {
      clearTimeout(timer);
      s.off("connect", up);
      s.off("disconnect", down);
      s.off("connect_error", down);
    };
  }, [graceMs]);
  return online;
}
