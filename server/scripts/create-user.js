// Create an account.
//   Admin (dashboard) user — signs in with an email:
//     npm run user:create -- admin@example.com 'a-strong-password'
//   Customer — signs in with a username (customers are normally created from the
//   admin panel, "مشتریان"):
//     npm run user:create -- --customer ali.rezaei 'a-strong-password' --name 'Ali Rezaei'
import { pool } from "../src/db/pool.js";
import { createUser } from "../src/modules/auth/auth.service.js";

let customer = false;
let fullName = null;
const positional = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--customer") customer = true;
  else if (argv[i] === "--name") fullName = argv[++i] ?? null;
  else positional.push(argv[i]);
}
const [identifier, password] = positional;

if (!identifier || !password) {
  console.error("Usage: npm run user:create -- [--customer] <email|username> <password> [--name 'Full name']");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

try {
  const user = await createUser(
    customer
      ? { username: identifier, password, role: "customer", fullName: fullName ?? identifier }
      : { email: identifier, password, role: "admin" },
  );
  console.log(`Created ${user.role} ${user.email ?? user.username} (${user.id})`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
