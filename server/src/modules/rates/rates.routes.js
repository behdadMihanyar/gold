import { Router } from "express";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";

// Gold/currency prices from brsapi.ir, fetched server-side: the provider does
// not allow browser (CORS) requests, and this keeps the API key out of the
// frontend bundle. Responses are cached briefly to stay within rate limits.
const CACHE_MS = 60_000;
const TIMEOUT_MS = 10_000;
let cache = { at: 0, data: null };
let inflight = null;

async function fetchRates() {
  const url = new URL("https://brsapi.ir/Api/Market/Gold_Currency.php");
  url.searchParams.set("key", config.brsapiKey);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`brsapi responded ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body?.gold)) throw new Error("brsapi: unexpected response");
  return body;
}

export const ratesRouter = Router();
ratesRouter.use(requireAuth);

// GET /api/rates  → the provider's payload ({ gold: [...], currency: [...], ... })
ratesRouter.get("/", async (_req, res) => {
  const fresh = Date.now() - cache.at < CACHE_MS;
  if (!fresh) {
    inflight ??= fetchRates().finally(() => (inflight = null));
    try {
      cache = { at: Date.now(), data: await inflight };
    } catch (err) {
      // Serve stale prices if we have any; otherwise report the outage.
      if (!cache.data) {
        console.error("rates:", err.message);
        throw new HttpError(502, "Price provider unavailable");
      }
    }
  }
  res.set("Cache-Control", "private, max-age=30").json(cache.data);
});
