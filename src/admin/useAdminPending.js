import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/market";
import { useSocketEvent, useSocketReconnect } from "../api/realtime";
import { chime } from "../panel/sound";

/** Number of requests waiting for an answer; beeps when a new one arrives. */
export function useAdminPending() {
  const [pending, setPending] = useState(0);
  const load = useCallback(() => adminApi.summary().then((s) => setPending(s.pending)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useSocketReconnect(load);
  useSocketEvent("request:changed", ({ action }) => {
    if (action === "created") chime(true);
    load();
  });
  return pending;
}
