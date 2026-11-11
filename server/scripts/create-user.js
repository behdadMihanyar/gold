// Create a dashboard user.
//   npm run user:create -- admin@example.com 'a-strong-password'
import { pool } from "../src/db/pool.js";
import { createUser } from "../src/modules/auth/auth.service.js";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run user:create -- <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

try {
  const user = await createUser({ email, password });
  console.log(`Created user ${user.email} (${user.id})`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
