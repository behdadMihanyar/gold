import { query } from "../../db/pool.js";
import { emitUserDisabled } from "../../realtime/events.js";
import { HttpError } from "../../utils/httpError.js";
import { likeContains } from "../../utils/numbers.js";
import { createUser, hashPassword } from "../auth/auth.service.js";

const toCustomer = (r) => ({
  id: r.id,
  username: r.username,
  fullName: r.full_name,
  phone: r.phone,
  isActive: r.is_active,
  createdAt: r.created_at,
  pendingRequests: Number(r.pending ?? 0),
  totalRequests: Number(r.total ?? 0),
});

const SELECT = `
  SELECT u.id, u.username, u.full_name, u.phone, u.is_active, u.created_at,
         count(r.id) FILTER (WHERE r.status = 'pending') AS pending,
         count(r.id) AS total
    FROM users u
    LEFT JOIN trade_requests r ON r.user_id = u.id`;

export async function listCustomers({ q, page, pageSize }) {
  const params = [];
  let filter = "";
  if (q) {
    params.push(likeContains(q));
    filter = `AND translate(lower(concat_ws(' ', u.full_name, u.username, u.phone)), 'يك', 'یک')
                LIKE translate(lower($1), 'يك', 'یک')`;
  }
  const [total, rows] = await Promise.all([
    query(`SELECT count(*) AS n FROM users u WHERE u.role = 'customer' ${filter}`, params),
    query(
      `${SELECT} WHERE u.role = 'customer' ${filter}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { data: rows.rows.map(toCustomer), total: Number(total.rows[0].n), page, pageSize };
}

export async function addCustomer(input) {
  const user = await createUser({ ...input, role: "customer" });
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt,
    pendingRequests: 0,
    totalRequests: 0,
  };
}

export async function updateCustomer(id, patch) {
  const sets = [];
  const params = [id];
  const add = (col, val) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if ("fullName" in patch) add("full_name", patch.fullName);
  if ("phone" in patch) add("phone", patch.phone);
  if ("isActive" in patch) add("is_active", patch.isActive);
  if ("password" in patch) add("password_hash", await hashPassword(patch.password));

  const { rows } = await query(
    `UPDATE users SET ${sets.join(", ")}
      WHERE id = $1 AND role = 'customer'
      RETURNING id`,
    params,
  );
  if (!rows[0]) throw HttpError.notFound("Customer not found");
  if (patch.isActive === false) emitUserDisabled(id);

  const full = await query(`${SELECT} WHERE u.id = $1 GROUP BY u.id`, [id]);
  return toCustomer(full.rows[0]);
}
