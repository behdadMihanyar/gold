import { config } from "../../config.js";
import { query, withTransaction } from "../../db/pool.js";
import { emitPricesChanged } from "../../realtime/events.js";
import { HttpError } from "../../utils/httpError.js";

const COLUMNS = `id, code, name, group_name, group_order, sort_order, unit,
  min_quantity, max_quantity, quantity_step, buy_price, sell_price, source_id,
  is_active, ledger_sync, prices_updated_at`;

/**
 * buyPrice  = what a customer pays to BUY from the shop (shown green)
 * sellPrice = what a customer receives when SELLING to the shop (shown red)
 * null      = not available («ندارید»)
 */
export function toProduct(row, { admin = false } = {}) {
  const product = {
    id: row.id,
    code: row.code,
    name: row.name,
    group: row.group_name,
    groupOrder: row.group_order,
    sortOrder: row.sort_order,
    unit: row.unit,
    minQuantity: Number(row.min_quantity),
    maxQuantity: Number(row.max_quantity),
    step: Number(row.quantity_step),
    buyPrice: row.buy_price ?? null,
    sellPrice: row.sell_price ?? null,
    isActive: row.is_active,
    updatedAt: row.prices_updated_at ?? null,
  };
  if (admin) {
    product.sourceId = row.source_id ?? null;
    product.ledgerSync = row.ledger_sync;
  }
  return product;
}

/**
 * Is the price feed trustworthy right now?
 *   manual  no collector has ever reported in → prices are edited by hand, always usable
 *   feed    a collector reports in; if it goes silent or loses its source, `live` turns
 *           false and customers cannot send requests (stale prices would be unsafe).
 */
export async function getFeedState(db = { query }) {
  const { rows } = await db.query(
    "SELECT connected, last_heartbeat_at FROM price_feed",
  );
  const row = rows[0] ?? {};
  const lastHeartbeatAt = row.last_heartbeat_at ?? null;
  const hasFeed = lastHeartbeatAt !== null;
  const silentMs = hasFeed ? Date.now() - new Date(lastHeartbeatAt).getTime() : 0;
  const stale =
    hasFeed &&
    config.feedStaleSeconds > 0 &&
    (!row.connected || silentMs > config.feedStaleSeconds * 1000);
  return {
    mode: hasFeed ? "feed" : "manual",
    live: !stale,
    connected: hasFeed ? Boolean(row.connected) : null,
    lastHeartbeatAt,
    staleAfterSeconds: config.feedStaleSeconds,
  };
}

/** The price board. Customers only see active products. */
export async function getBoard({ admin = false } = {}) {
  const [{ rows }, feed] = await Promise.all([
    query(
      `SELECT ${COLUMNS} FROM products
        ${admin ? "" : "WHERE is_active"}
        ORDER BY group_order, sort_order`,
    ),
    getFeedState(),
  ]);
  const products = rows.map((r) => toProduct(r, { admin }));
  const times = products.map((p) => p.updatedAt).filter(Boolean).map((t) => new Date(t).getTime());
  const board = {
    products,
    feed,
    updatedAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
    serverTime: new Date().toISOString(),
  };
  if (admin) {
    // Feed items nobody has mapped to a product yet, so the admin can match them
    // by their prices.
    const unmapped = await query(
      `SELECT source_id, name, buy_price, sell_price, seen_at
         FROM price_feed_items
        WHERE source_id NOT IN (SELECT source_id FROM products WHERE source_id IS NOT NULL)
        ORDER BY source_id`,
    );
    board.unmappedFeedItems = unmapped.rows.map((r) => ({
      sourceId: r.source_id,
      name: r.name ?? null,
      buyPrice: r.buy_price ?? null,
      sellPrice: r.sell_price ?? null,
      seenAt: r.seen_at,
    }));
  }
  return board;
}

export async function updateProduct(id, patch) {
  const updated = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM products WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const current = rows[0];
    if (!current) throw HttpError.notFound("Product not found");

    const next = {
      buy_price: "buyPrice" in patch ? patch.buyPrice : current.buy_price,
      sell_price: "sellPrice" in patch ? patch.sellPrice : current.sell_price,
      is_active: patch.isActive ?? current.is_active,
      source_id: "sourceId" in patch ? patch.sourceId : current.source_id,
    };
    let pricesChanged = "buyPrice" in patch || "sellPrice" in patch;

    // Linking to a feed item adopts the prices it last reported, right away.
    if (
      "sourceId" in patch &&
      patch.sourceId !== null &&
      patch.sourceId !== current.source_id &&
      !pricesChanged
    ) {
      const item = await db.query(
        "SELECT buy_price, sell_price FROM price_feed_items WHERE source_id = $1",
        [patch.sourceId],
      );
      if (item.rows[0]) {
        next.buy_price = item.rows[0].buy_price;
        next.sell_price = item.rows[0].sell_price;
        pricesChanged = true;
      }
    }

    try {
      const res = await db.query(
        `UPDATE products
            SET buy_price = $2, sell_price = $3, is_active = $4, source_id = $5,
                prices_updated_at = CASE WHEN $6 THEN now() ELSE prices_updated_at END
          WHERE id = $1
          RETURNING ${COLUMNS}`,
        [id, next.buy_price, next.sell_price, next.is_active, next.source_id, pricesChanged],
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw HttpError.conflict("This feed ID is already linked to another product", {
          code: "SOURCE_ID_TAKEN",
        });
      }
      throw err;
    }
  });

  emitPricesChanged([toProduct(updated)], await getFeedState());
  return toProduct(updated, { admin: true });
}
