import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../../config.js";
import { validate } from "../../middleware/validate.js";
import { HttpError } from "../../utils/httpError.js";
import { applyIngest } from "./ingest.service.js";
import { ingestBody } from "./prices.schemas.js";

const sha = (s) => createHash("sha256").update(s).digest();

/** Constant-time comparison of the relay key. */
function keyMatches(given) {
  return typeof given === "string" && timingSafeEqual(sha(given), sha(config.priceRelayKey));
}

export const pricesRouter = Router();

// A collector sends a few events per second at most.
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

/** Reject before parsing anything: no key configured → 404, wrong key → 401. */
function requireRelayKey(req, _res, next) {
  if (!config.priceRelayKey) throw HttpError.notFound(); // disabled until PRICE_RELAY_KEY is set
  if (!keyMatches(req.get("x-qasr-relay-key"))) throw HttpError.unauthorized("Invalid relay key");
  next();
}

// POST /api/prices/ingest   (header: X-Qasr-Relay-Key)
// Compatible with the collector's payload; answers {ok: true} like the old receiver.
pricesRouter.post("/ingest", requireRelayKey, limiter, validate(ingestBody), async (req, res) => {
  const { changed } = await applyIngest(req.valid.body);
  res.json({ ok: true, changed });
});
