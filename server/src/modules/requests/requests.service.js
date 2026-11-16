import { query, withTransaction } from "../../db/pool.js";
import { emitOrderChanged, emitRequestChanged } from "../../realtime/events.js";
import { HttpError } from "../../utils/httpError.js";
import { toJalali } from "../../utils/jalali.js";
import { likeContains } from "../../utils/numbers.js";
import { effectivePrice, getFeedState } from "../products/products.service.js";

const MAX_PENDING_PER_CUSTOMER = 20;

const SELECT = `
  SELECT r.id, r.user_id, r.product_id, r.product_name, r.unit, r.side, r.quantity,
         r.unit_price, r.total, r.price_unit, r.price_per, r.status, r.customer_note, r.admin_note,
         r.created_at, r.decided_at, r.seen_at, r.ledger_order_id,
         u.full_name AS customer_name, u.username AS customer_username,
         u.phone AS customer_phone,
         CASE r.side WHEN 'buy' THEN p.buy_price ELSE p.sell_price END AS market_base,
         CASE r.side WHEN 'buy' THEN p.buy_adjust ELSE p.sell_adjust END AS market_adjust,
         p.ledger_sync
    FROM trade_requests r
    JOIN users u ON u.id = r.user_id
    JOIN products p ON p.id = r.product_id`;

// ------------------------------------------------------------------ shapes

const base = (r) => ({
  id: r.id,
  side: r.side, // customer's point of view: "buy" = customer buys from the shop
  productId: r.product_id,
  productName: r.product_name,
  unit: r.unit,
  quantity: Number(r.quantity),
  unitPrice: r.unit_price,
  priceUnit: r.price_unit ?? r.unit, // unitPrice is per this; pricePer units make one
  pricePer: Number(r.price_per ?? 1),
  total: r.total,
  status: r.status,
  customerNote: r.customer_note ?? null,
  adminNote: r.admin_note ?? null,
  createdAt: r.created_at,
  decidedAt: r.decided_at ?? null,
  seenAt: r.seen_at ?? null,
});

/** What the customer who made the request may see. */
export const toCustomerRequest = (r) => base(r);

/** What admins see: the same plus who asked and how the market moved since. */
export const toAdminRequest = (r) => ({
  ...base(r),
  customer: {
    id: r.user_id,
    name: r.customer_name ?? r.customer_username,
    username: r.customer_username ?? null,
    phone: r.customer_phone ?? null,
  },
  marketPrice: effectivePrice(r.market_base, r.market_adjust), // today's price, same side
  ledgerEligible:
    Boolean(r.ledger_sync) && Number.isInteger(Number(r.quantity)) && Number(r.price_per ?? 1) === 1,
  ledgerOrderId: r.ledger_order_id ?? null,
});

// ------------------------------------------------------------------ customers

const SCALE = 1000; // quantities have at most 3 decimals; compare as integers
const units = (n) => Math.round(Number(n) * SCALE);

function assertQuantity(product, quantity) {
  const q = units(quantity);
  if (Math.abs(Number(quantity) * SCALE - q) > 1e-6) {
    throw HttpError.badRequest(
      "Quantity has too many decimals",
      [{ field: "quantity", message: "At most 3 decimals" }],
      { code: "BAD_QUANTITY" },
    );
  }
  const min = units(product.min_quantity);
  const max = units(product.max_quantity);
  const step = units(product.quantity_step);
  if (q < min || q > max) {
    throw HttpError.badRequest(
      "Quantity out of range",
      [{ field: "quantity", message: `Quantity must be between ${min / SCALE} and ${max / SCALE}` }],
      { code: "BAD_QUANTITY" },
    );
  }
  if (q % step !== 0) {
    throw HttpError.badRequest(
      "Quantity step",
      [{ field: "quantity", message: `Quantity must be a multiple of ${step / SCALE}` }],
      { code: "BAD_QUANTITY" },
    );
  }
}

/**
 * Create a request. The price is read from the database and locked into the
 * request; the client's `quotedPrice` is only a check that it saw the same price.
 * Returns { request, created } — created is false when `clientKey` matched an
 * earlier submit (a double click or a retry).
 */
export async function createRequest(user, input) {
  const { row, created } = await withTransaction(async (db) => {
    if (input.clientKey) {
      const dup = await db.query(`${SELECT} WHERE r.user_id = $1 AND r.client_key = $2`, [
        user.id,
        input.clientKey,
      ]);
      if (dup.rows[0]) return { row: dup.rows[0], created: false };
    }

    // FOR SHARE: the price cannot change between reading it and inserting the request.
    const found = await db.query(
      `SELECT id, name, unit, min_quantity, max_quantity, quantity_step,
              buy_price, sell_price, buy_adjust, sell_adjust, price_unit, price_per, is_active
         FROM products WHERE id = $1 FOR SHARE`,
      [input.productId],
    );
    const product = found.rows[0];
    if (!product?.is_active) {
      throw HttpError.notFound("This product is not available");
    }

    const feed = await getFeedState(db);
    if (!feed.live) {
      throw HttpError.unavailable("Prices are not up to date right now", { code: "PRICES_STALE" });
    }

    // The customer trades at the marked-up price they saw, never the raw source price.
    const price =
      input.side === "buy"
        ? effectivePrice(product.buy_price, product.buy_adjust)
        : effectivePrice(product.sell_price, product.sell_adjust);
    if (!price) {
      throw HttpError.conflict("This product is not available for this operation", {
        code: "NOT_AVAILABLE",
      });
    }
    if (input.quotedPrice !== undefined && input.quotedPrice !== price) {
      throw HttpError.conflict("The price has changed", {
        code: "PRICE_CHANGED",
        data: { currentPrice: price },
      });
    }
    assertQuantity(product, input.quantity);

    const pending = await db.query(
      "SELECT count(*) AS n FROM trade_requests WHERE user_id = $1 AND status = 'pending'",
      [user.id],
    );
    if (Number(pending.rows[0].n) >= MAX_PENDING_PER_CUSTOMER) {
      throw HttpError.conflict("Too many requests are waiting for an answer", {
        code: "TOO_MANY_PENDING",
      });
    }

    const inserted = await db.query(
      `INSERT INTO trade_requests
         (user_id, product_id, product_name, unit, side, quantity, unit_price, customer_note, client_key,
          price_unit, price_per)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        user.id,
        product.id,
        product.name,
        product.unit,
        input.side,
        input.quantity,
        price,
        input.note ?? null,
        input.clientKey ?? null,
        product.price_unit ?? product.unit,
        product.price_per ?? 1,
      ],
    );
    const full = await db.query(`${SELECT} WHERE r.id = $1`, [inserted.rows[0].id]);
    return { row: full.rows[0], created: true };
  });

  if (created) {
    emitRequestChanged("created", row.user_id, {
      forAdmin: toAdminRequest(row),
      forCustomer: toCustomerRequest(row),
    });
  }
  return { request: toCustomerRequest(row), created };
}

export async function listForCustomer(userId, { status, page, pageSize }) {
  const where = ["r.user_id = $1"];
  const params = [userId];
  if (status !== "all") {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;

  const [total, rows, unseen] = await Promise.all([
    query(`SELECT count(*) AS n FROM trade_requests r ${clause}`, params),
    query(
      `${SELECT} ${clause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
    countUnseen(userId),
  ]);
  return {
    data: rows.rows.map(toCustomerRequest),
    total: Number(total.rows[0].n),
    page,
    pageSize,
    unseen,
  };
}

async function countUnseen(userId) {
  const { rows } = await query(
    `SELECT count(*) AS n FROM trade_requests
      WHERE user_id = $1 AND seen_at IS NULL AND status IN ('accepted', 'rejected')`,
    [userId],
  );
  return Number(rows[0].n);
}

/** Decisions the customer has not looked at yet (feeds the notification bell). */
export async function listUnseen(userId) {
  const { rows } = await query(
    `${SELECT}
      WHERE r.user_id = $1 AND r.seen_at IS NULL AND r.status IN ('accepted', 'rejected')
      ORDER BY r.decided_at DESC, r.id DESC
      LIMIT 50`,
    [userId],
  );
  return rows.map(toCustomerRequest);
}

/** Mark decisions as seen (all of them, or just `ids`). Returns how many changed. */
export async function markSeen(userId, ids) {
  const params = [userId];
  let filter = "";
  if (ids?.length) {
    params.push(ids);
    filter = `AND id = ANY($2::bigint[])`;
  }
  const { rows } = await query(
    `UPDATE trade_requests SET seen_at = now()
      WHERE user_id = $1 AND seen_at IS NULL AND status IN ('accepted', 'rejected') ${filter}
      RETURNING id`,
    params,
  );
  return rows.length;
}

export async function cancelRequest(user, id) {
  const row = await withTransaction(async (db) => {
    const res = await db.query(
      `UPDATE trade_requests
          SET status = 'cancelled', decided_at = now(), seen_at = now()
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
        RETURNING id`,
      [id, user.id],
    );
    if (!res.rows[0]) {
      const current = await db.query(
        "SELECT status FROM trade_requests WHERE id = $1 AND user_id = $2",
        [id, user.id],
      );
      if (!current.rows[0]) throw HttpError.notFound("Request not found");
      throw HttpError.conflict("This request has already been answered", {
        code: "ALREADY_DECIDED",
        data: { status: current.rows[0].status },
      });
    }
    return (await db.query(`${SELECT} WHERE r.id = $1`, [id])).rows[0];
  });

  emitRequestChanged("cancelled", row.user_id, {
    forAdmin: toAdminRequest(row),
    forCustomer: toCustomerRequest(row),
  });
  return toCustomerRequest(row);
}

// ------------------------------------------------------------------ admins

export async function listForAdmin({ status, side, userId, q, page, pageSize }) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (status !== "all") add("r.status = ?", status);
  if (side) add("r.side = ?", side);
  if (userId) add("r.user_id = ?", userId);
  if (q) {
    // ي/ك (Arabic keyboards) and ی/ک (Persian) are treated as the same letters.
    add(
      `translate(lower(concat_ws(' ', u.full_name, u.username, r.product_name)), 'يك', 'یک')
         LIKE translate(lower(?), 'يك', 'یک')`,
      likeContains(q),
    );
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [total, rows] = await Promise.all([
    query(
      `SELECT count(*) AS n FROM trade_requests r JOIN users u ON u.id = r.user_id ${clause}`,
      params,
    ),
    query(
      `${SELECT} ${clause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return {
    data: rows.rows.map(toAdminRequest),
    total: Number(total.rows[0].n),
    page,
    pageSize,
  };
}

/** Counts for the inbox tabs and the sidebar badge. */
export async function adminSummary() {
  const { rows } = await query(
    `SELECT status, count(*) AS n FROM trade_requests GROUP BY status`,
  );
  const counts = { pending: 0, accepted: 0, rejected: 0, cancelled: 0 };
  for (const r of rows) counts[r.status] = Number(r.n);
  return counts;
}

async function decide(admin, id, status, { note = null, recordInLedger = false } = {}) {
  let ledger = null;

  const row = await withTransaction(async (db) => {
    // Lock the row: two admins answering at once cannot both succeed.
    const found = await db.query(`${SELECT} WHERE r.id = $1 FOR UPDATE OF r`, [id]);
    const current = found.rows[0];
    if (!current) throw HttpError.notFound("Request not found");
    if (current.status !== "pending") {
      throw HttpError.conflict("This request has already been answered", {
        code: "ALREADY_DECIDED",
        data: { status: current.status },
      });
    }

    await db.query(
      `UPDATE trade_requests
          SET status = $2, decided_at = now(), decided_by = $3, admin_note = $4
        WHERE id = $1`,
      [id, status, admin.id, note],
    );

    if (status === "accepted" && recordInLedger) {
      if (!toAdminRequest(current).ledgerEligible) {
        throw HttpError.badRequest(
          "This request cannot be recorded in the orders ledger (whole coins only)",
          undefined,
          { code: "LEDGER_NOT_SUPPORTED" },
        );
      }
      // The ledger is written from the shop's side: when the customer buys, the shop sells.
      const shopSide = current.side === "buy" ? "sell" : "buy";
      const order = await db.query(
        `INSERT INTO orders (side, name, quantity, unit_price, jalali_date, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          shopSide,
          current.customer_name ?? current.customer_username,
          Number(current.quantity),
          current.unit_price,
          toJalali(),
          `درخواست آنلاین #${current.id} — ${current.product_name}`,
          admin.id,
        ],
      );
      await db.query("UPDATE trade_requests SET ledger_order_id = $2 WHERE id = $1", [
        id,
        order.rows[0].id,
      ]);
      ledger = { side: shopSide, id: order.rows[0].id };
    }

    return (await db.query(`${SELECT} WHERE r.id = $1`, [id])).rows[0];
  });

  if (ledger) emitOrderChanged(ledger.side, "INSERT", ledger.id);
  emitRequestChanged(status, row.user_id, {
    forAdmin: toAdminRequest(row),
    forCustomer: toCustomerRequest(row),
  });
  return toAdminRequest(row);
}

export const acceptRequest = (admin, id, opts) => decide(admin, id, "accepted", opts);
export const rejectRequest = (admin, id, opts) => decide(admin, id, "rejected", opts);
