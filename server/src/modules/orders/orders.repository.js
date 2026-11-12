import { query } from "../../db/pool.js";

const COLUMNS = `id, side, name, quantity, unit_price, total, jalali_date,
                 delivery, description, status, accounting, created_at, updated_at`;

// API field → DB column, for the fields a client may write.
const WRITABLE = {
  name: "name",
  quantity: "quantity",
  price: "unit_price",
  date: "jalali_date",
  delivery: "delivery",
  description: "description",
  status: "status",
  accounting: "accounting",
};

const toOrder = (row) => ({
  id: row.id,
  side: row.side,
  name: row.name,
  quantity: row.quantity,
  price: row.unit_price,
  total: row.total,
  date: row.jalali_date,
  delivery: row.delivery,
  description: row.description,
  status: row.status,
  accounting: row.accounting,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const escapeLike = (s) => s.replace(/[\\%_]/g, "\\$&");

function buildFilter(side, { date, q } = {}) {
  const clauses = ["side = $1"];
  const params = [side];
  if (date) {
    params.push(date);
    clauses.push(`jalali_date = $${params.length}`);
  }
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    clauses.push(`name ILIKE $${params.length}`);
  }
  return { where: clauses.join(" AND "), params };
}

export async function listOrders(side, { page, pageSize, date, q }) {
  const { where, params } = buildFilter(side, { date, q });
  const offset = (page - 1) * pageSize;

  const [rows, count] = await Promise.all([
    query(
      `SELECT ${COLUMNS} FROM orders
        WHERE ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
    query(`SELECT count(*)::int AS total FROM orders WHERE ${where}`, params),
  ]);

  return { data: rows.rows.map(toOrder), total: count.rows[0].total };
}

export async function summarize(side, { date } = {}) {
  const { where, params } = buildFilter(side, { date });
  const { rows } = await query(
    `SELECT count(*)::int                 AS count,
            coalesce(sum(quantity), 0)::bigint AS quantity,
            coalesce(sum(total), 0)::bigint    AS amount
       FROM orders WHERE ${where}`,
    params,
  );
  // bigint comes back from pg as a string; the sums stay far below 2^53.
  const { count, quantity, amount } = rows[0];
  return { count, quantity: Number(quantity), amount: Number(amount) };
}

export async function findOrder(side, id) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM orders WHERE side = $1 AND id = $2`,
    [side, id],
  );
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function insertOrder(side, fields, userId) {
  const entries = Object.entries(fields).filter(([k]) => k in WRITABLE);
  const columns = ["side", "created_by", ...entries.map(([k]) => WRITABLE[k])];
  const values = [side, userId, ...entries.map(([, v]) => v)];
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const { rows } = await query(
    `INSERT INTO orders (${columns.join(", ")})
     VALUES (${placeholders})
     RETURNING ${COLUMNS}`,
    values,
  );
  return toOrder(rows[0]);
}

export async function updateOrder(side, id, fields) {
  const entries = Object.entries(fields).filter(([k]) => k in WRITABLE);
  const sets = entries.map(([k], i) => `${WRITABLE[k]} = $${i + 3}`);

  const { rows } = await query(
    `UPDATE orders SET ${sets.join(", ")}
      WHERE side = $1 AND id = $2
      RETURNING ${COLUMNS}`,
    [side, id, ...entries.map(([, v]) => v)],
  );
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function deleteOrder(side, id) {
  const { rowCount } = await query(
    "DELETE FROM orders WHERE side = $1 AND id = $2",
    [side, id],
  );
  return rowCount > 0;
}
