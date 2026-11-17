import { Router } from "express";
import { z } from "zod";
import { config } from "../../config.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { HttpError } from "../../utils/httpError.js";

/**
 * Admin-only bridge to the price collector's local control server
 * (tools/zarabgold-collector.py, 127.0.0.1 only):
 *  - save the Hanzaei account the collector uses to sign in again by itself
 *    whenever the site logs it out (the password is stored by the collector on
 *    this server and is never sent back to any browser);
 *  - see the collector's browser and click/type into it by hand if ever needed.
 */
export const collectorRouter = Router();
collectorRouter.use(requireAuth, requireRole("admin"));

async function callCollector(path, { method = "GET", body, timeout = 30_000 } = {}) {
  if (!config.priceRelayKey) {
    throw HttpError.unavailable("PRICE_RELAY_KEY is not configured", { code: "NOT_CONFIGURED" });
  }
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${config.collectorControlPort}${path}`, {
      method,
      headers: {
        "X-Qasr-Relay-Key": config.priceRelayKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw HttpError.unavailable("The collector is not running", { code: "COLLECTOR_DOWN" });
  }
  if (res.status === 400) {
    throw HttpError.badRequest("The collector refused this action", undefined, { code: "COLLECTOR_REFUSED" });
  }
  if (!res.ok) throw HttpError.unavailable("The collector could not do that right now", { code: "COLLECTOR_BUSY" });
  return res;
}

// GET /api/admin/collector/state
collectorRouter.get("/state", async (_req, res) => {
  res.json({ data: await (await callCollector("/state")).json() });
});

// GET /api/admin/collector/screenshot  → image/jpeg
collectorRouter.get("/screenshot", async (_req, res) => {
  const shot = Buffer.from(await (await callCollector("/screenshot")).arrayBuffer());
  res.set({ "Content-Type": "image/jpeg", "Cache-Control": "no-store" }).send(shot);
});

const actions = {
  click: z.object({ x: z.number().min(0).max(10_000), y: z.number().min(0).max(10_000) }),
  type: z.object({ text: z.string().min(1).max(500) }),
  key: z.object({
    key: z.enum(["Enter", "Tab", "Backspace", "Delete", "Escape", "ArrowUp", "ArrowDown",
      "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]),
  }),
  scroll: z.object({ dy: z.number().min(-3000).max(3000) }),
  home: z.object({}),
  reload: z.object({}),
};

// POST /api/admin/collector/:action
for (const [name, schema] of Object.entries(actions)) {
  collectorRouter.post(`/${name}`, validate(schema), async (req, res) => {
    const slow = name === "home" || name === "reload";
    await callCollector(`/${name}`, { method: "POST", body: req.valid.body, timeout: slow ? 70_000 : 30_000 });
    res.json({ ok: true });
  });
}

// Persian/Arabic digits typed on a phone keyboard are fine.
const latinDigits = (v) =>
  v.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

const accountBody = z.object({
  username: z.string().trim().transform(latinDigits).pipe(z.string().min(3).max(64)),
  password: z.string().min(1).max(200),
});

// POST /api/admin/collector/account   save the Hanzaei account (and sign in now)
collectorRouter.post("/account", validate(accountBody), async (req, res) => {
  await callCollector("/account", { method: "POST", body: req.valid.body });
  res.json({ ok: true });
});

// POST /api/admin/collector/account/clear   forget it
collectorRouter.post("/account/clear", async (_req, res) => {
  await callCollector("/account/clear", { method: "POST", body: {} });
  res.json({ ok: true });
});

// POST /api/admin/collector/login-now   sign in right away (also retries a rejected account)
collectorRouter.post("/login-now", async (_req, res) => {
  await callCollector("/login-now", { method: "POST", body: {} });
  res.json({ ok: true });
});
