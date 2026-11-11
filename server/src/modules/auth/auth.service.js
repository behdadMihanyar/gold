import bcrypt from "bcryptjs";
import { query } from "../../db/pool.js";
import { HttpError } from "../../utils/httpError.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so response time doesn't reveal
// which emails exist.
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", BCRYPT_ROUNDS);

const toPublicUser = (row) => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
});

export async function createUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.trim().toLowerCase(), passwordHash],
    );
    return toPublicUser(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      throw HttpError.conflict("A user with this email already exists");
    }
    throw err;
  }
}

export async function authenticate({ email, password }) {
  const { rows } = await query(
    `SELECT id, email, password_hash, created_at
       FROM users
      WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw HttpError.unauthorized("Invalid email or password");
  return toPublicUser(user);
}

export async function findUserById(id) {
  const { rows } = await query(
    "SELECT id, email, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ? toPublicUser(rows[0]) : null;
}
