import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { marketApi, requestsApi } from "../api/market";
import { useSocketEvent, useSocketReconnect } from "../api/realtime";
import { chime } from "./sound";

const Ctx = createContext(null);
export const usePanel = () => useContext(Ctx);

let toastId = 0;

/** Live price board + the customer's own notifications, shared by every panel page. */
export function PanelProvider({ children }) {
  const [board, setBoard] = useState({ products: [], feed: null });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState({}); // productId -> "up" | "down"
  const [unseen, setUnseen] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [rev, setRev] = useState(0); // bumps when the customer's requests change
  const flashTimers = useRef({});
  const boardRef = useRef(new Map());
  useEffect(() => {
    boardRef.current = new Map(board.products.map((p) => [p.id, p]));
  }, [board.products]);

  const loadBoard = useCallback(async () => {
    try {
      const b = await marketApi.board();
      setBoard({ products: b.products ?? b.data ?? [], feed: b.feed ?? null });
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);
  const loadUnseen = useCallback(
    () => requestsApi.unseen().then(setUnseen).catch(() => {}),
    [],
  );

  useEffect(() => {
    loadBoard();
    loadUnseen();
  }, [loadBoard, loadUnseen]);
  useSocketReconnect(() => {
    loadBoard();
    loadUnseen();
    setRev((n) => n + 1);
  });

  const pushToast = useCallback((toast) => {
    const id = ++toastId;
    setToasts((t) => [...t.slice(-3), { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.ttl ?? 9000);
    return id;
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useSocketEvent("prices:changed", ({ products, feed }) => {
    setBoard((prev) => {
      const byId = new Map(products.map((p) => [p.id, p]));
      const next = prev.products.map((p) => byId.get(p.id) ?? p);
      for (const p of products) if (!next.some((x) => x.id === p.id)) next.push(p);
      return { products: next, feed: feed ?? prev.feed };
    });
    for (const p of products) {
      const old = boardRef.current.get(p.id);
      const dir = old && old.buyPrice !== p.buyPrice ? (p.buyPrice > (old.buyPrice ?? 0) ? "up" : "down") : null;
      if (dir) {
        clearTimeout(flashTimers.current[p.id]);
        setFlash((f) => ({ ...f, [p.id]: dir }));
        flashTimers.current[p.id] = setTimeout(
          () => setFlash((f) => ({ ...f, [p.id]: null })),
          1600,
        );
      }
    }
  });
  useSocketEvent("request:changed", ({ action, request }) => {
    setRev((n) => n + 1);
    if (action === "accepted" || action === "rejected") {
      setUnseen((u) => (u.some((r) => r.id === request.id) ? u : [request, ...u]));
      chime(action === "accepted");
      pushToast({ kind: action, request, ttl: 15000 });
    }
  });

  const markSeen = useCallback(async (ids) => {
    setUnseen((u) => (ids ? u.filter((r) => !ids.includes(r.id)) : []));
    await requestsApi.markSeen(ids).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      products: board.products,
      feed: board.feed,
      loaded,
      failed,
      flash,
      reload: loadBoard,
      unseen,
      markSeen,
      toasts,
      pushToast,
      dismissToast,
      rev,
      bump: () => setRev((n) => n + 1),
    }),
    [board, loaded, failed, flash, loadBoard, unseen, markSeen, toasts, pushToast, dismissToast, rev],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
