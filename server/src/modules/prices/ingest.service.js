import { withTransaction } from "../../db/pool.js";
import { emitPricesChanged } from "../../realtime/events.js";
import { getFeedState, toProduct } from "../products/products.service.js";
import { normalizePrice } from "./prices.schemas.js";

const PRODUCT_COLUMNS = `id, code, name, group_name, group_order, sort_order, unit,
  min_quantity, max_quantity, quantity_step, buy_price, sell_price, source_id,
  is_active, ledger_sync, prices_updated_at`;

/** When the collector saw this event, never later than now (its clock may drift). */
function observedTime(observedAt) {
  const t = observedAt ? Date.parse(observedAt) : NaN;
  return new Date(Number.isFinite(t) ? Math.min(t, Date.now()) : Date.now());
}

/**
 * Apply one collector event.
 *
 *  heartbeat  the collector is alive; `connected` says whether its browser is
 *             subscribed to the price source.
 *  update     live change for some items; only the keys present are changed.
 *  snapshot   full read of the board; both prices of every row are authoritative
 *             (a missing price means «ندارید» → null).
 *
 * Replays are safe: events older than what we already hold are ignored, so a
 * collector that was offline and flushes its backlog cannot overwrite newer data.
 */
export async function applyIngest(body) {
  const at = observedTime(body.observedAt);

  const changed = await withTransaction(async (db) => {
    if (body.kind === "heartbeat") {
      await db.query(
        `UPDATE price_feed
            SET connected = CASE WHEN last_heartbeat_at IS NULL OR $2 >= last_heartbeat_at
                                 THEN $1 ELSE connected END,
                last_heartbeat_at = GREATEST(last_heartbeat_at, $2)`,
        [Boolean(body.connected), at],
      );
      return [];
    }

    const updated = [];
    for (const item of body.products ?? []) {
      const buy = normalizePrice(item.buy);
      const sell = normalizePrice(item.sell);
      const isSnapshot = body.kind === "snapshot";
      // Key absent in a live update → leave that side alone.
      const setBuy = isSnapshot || buy !== undefined;
      const setSell = isSnapshot || sell !== undefined;
      if (!setBuy && !setSell) continue;

      const feedRow = await db.query(
        `INSERT INTO price_feed_items (source_id, buy_price, sell_price, seen_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id) DO UPDATE SET
           buy_price  = CASE WHEN $5 THEN EXCLUDED.buy_price  ELSE price_feed_items.buy_price  END,
           sell_price = CASE WHEN $6 THEN EXCLUDED.sell_price ELSE price_feed_items.sell_price END,
           seen_at    = EXCLUDED.seen_at
         WHERE price_feed_items.seen_at <= EXCLUDED.seen_at
         RETURNING buy_price, sell_price`,
        [item.id, buy ?? null, sell ?? null, at, setBuy, setSell],
      );
      if (!feedRow.rows[0]) continue; // an older event than what we already have

      const product = await db.query(
        `UPDATE products
            SET buy_price = $2, sell_price = $3, prices_updated_at = $4
          WHERE source_id = $1
            AND (buy_price IS DISTINCT FROM $2 OR sell_price IS DISTINCT FROM $3)
          RETURNING ${PRODUCT_COLUMNS}`,
        [item.id, feedRow.rows[0].buy_price, feedRow.rows[0].sell_price, at],
      );
      updated.push(...product.rows);
    }

    await db.query(
      `UPDATE price_feed SET last_price_at = GREATEST(last_price_at, $1)`,
      [at],
    );
    return updated;
  });

  if (changed.length) {
    emitPricesChanged(changed.map((r) => toProduct(r)), await getFeedState());
  }
  return { changed: changed.length };
}
