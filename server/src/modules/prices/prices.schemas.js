import { z } from "zod";
import { parseInteger } from "../../utils/numbers.js";

const MAX_PRICE = 1e13; // rials; far above any real price, still exact as a JS number

/**
 * A price as the collector or an admin form sends it: 106220000, "106,220,000",
 * "۱۰۶٬۲۲۰٬۰۰۰". Anything that isn't a positive amount (0, "", "ندارید") means
 * "not available" and becomes null. `undefined` (key absent) stays undefined.
 */
export function normalizePrice(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = parseInteger(typeof value === "number" ? Math.trunc(value) : String(value));
  return Number.isFinite(n) && n > 0 && n <= MAX_PRICE ? n : null;
}

const price = z.union([z.number(), z.string(), z.null()]).optional();

// Same payload the WordPress relay used:
//   { eventId, kind: "update"|"snapshot", observedAt, products: [{ id, buy?, sell? }] }
//   { eventId, kind: "heartbeat", observedAt, connected }
export const ingestBody = z.object({
  eventId: z.string().max(100).optional(),
  kind: z.enum(["update", "snapshot", "heartbeat"]),
  observedAt: z.string().max(40).optional(),
  connected: z.boolean().optional(),
  products: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        // Product name as shown on the source board (snapshots only); used to link
        // collector ids to our products automatically.
        name: z.string().trim().max(120).optional(),
        buy: price,
        sell: price,
      }),
    )
    .max(200)
    .optional(),
});

// Admin edits. Prices may be cleared (null = «ندارید»).
const adminPrice = z.union([z.number(), z.string(), z.null()]).transform(normalizePrice);

export const updateProductBody = z
  .object({
    buyPrice: adminPrice,
    sellPrice: adminPrice,
    isActive: z.boolean(),
    sourceId: z.union([z.number().int().positive(), z.null()]),
    // Signed markup added to the source price before customers see it (rials).
    buyAdjust: z.number().int().min(-1e12).max(1e12),
    sellAdjust: z.number().int().min(-1e12).max(1e12),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to update" });
