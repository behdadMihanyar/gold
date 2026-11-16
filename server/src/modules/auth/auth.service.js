import bcrypt from "bcryptjs";
import { query } from "../../db/pool.js";
import { HttpError } from "../../utils/httpError.js";
import { toLatinDigits } from "../../utils/numbers.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the account is unknown, so response time doesn't reveal
// which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", BCRYPT_ROUNDS);

const USER_COLUMNS =
  "id, email, username, role, full_name, phone, is_active, created_at";

export const toPublicUser = (row) => ({
  id: row.id,
  email: row.email ?? null,
  username: row.username ?? null,
  role: row.role,
  fullName: row.full_name ?? null,
  phone: row.phone ?? null,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

/**
 * Create an account.
 *   admin    → needs an email (they sign in with it)
 *   customer → needs a username (chosen by the admin)
 */
export async function createUser({
  email = null,
  username = null,
  password,
  role = "admin",
  fullName = null,
  phone = null,
}) {
  const passwordHash = await hashPassword(password);
  try {
    const { rows } = await query(
      `INSERT INTO users (email, username, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${USER_COLUMNS}`,
      [
        email ? email.trim().toLowerCase() : null,
        username ? username.trim().toLowerCase() : null,
        passwordHash,
        role,
        fullName,
        phone,
      ],
    );
    return toPublicUser(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      throw HttpError.conflict(
        err.constraint === "users_username_key"
          ? "This username is already taken"
          : "A user with this email already exists",
        { code: "DUPLICATE" },
      );
    }
    throw err;
  }
}

/** `identifier` is an email (admins) or a username (customers). */
export async function authenticate({ identifier, password }) {
  const id = toLatinDigits(identifier).trim().toLowerCase();
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, password_hash
       FROM users
      WHERE lower(email) = $1 OR username = $1`,
    [id],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw HttpError.unauthorized("Invalid username or password");
  // Only reveal the account is disabled to someone who knows its password.
  if (!user.is_active) {
    throw HttpError.forbidden("This account has been disabled", { code: "ACCOUNT_DISABLED" });
  }
  return toPublicUser(user);
}

/** The signed-in user, or null if the account no longer exists or is disabled. */
export async function findActiveUser(id) {
  const { rows } = await query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND is_active`,
    [id],
  );
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const ok = await bcrypt.compare(currentPassword, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows[0] || !ok) {
    throw HttpError.badRequest("Current password is incorrect", undefined, {
      code: "WRONG_PASSWORD",
    });
  }
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [
    userId,
    await hashPassword(newPassword),
  ]);
}
