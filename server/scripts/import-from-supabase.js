// One-off migration of existing data from the old Supabase project.
//
//   SUPABASE_DB_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres' \
//     node scripts/import-from-supabase.js
//
// Copies:
//   public.buy   → orders (side = 'buy')
//   public.tasks → orders (side = 'sell')
//   auth.users   → users  (bcrypt hashes are compatible, so passwords keep working)
//
// Runs in a single transaction and refuses to run if `orders` already has rows.
import pg from "pg";
import { pool as target } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
import { STATUSES } from "../src/modules/orders/orders.schemas.js";
import { normalizeJalaliDate, parseInteger } from "../src/utils/numbers.js";

const sourceUrl = process.env.SUPABASE_DB_URL;
if (!sourceUrl) {
  console.error("Set SUPABASE_DB_URL (Supabase → Project settings → Database → Connection string).");
  process.exit(1);
}

const source = new pg.Client({
  connectionString: sourceUrl,
  ssl: { rejectUnauthorized: false },
});

function convertOrder(row) {
  const quantity = parseInteger(row.quantity);
  let price = parseInteger(row.price);
  const total = parseInteger(row.total);
  if (Number.isNaN(price) && quantity > 0 && !Number.isNaN(total)) {
    price = Math.round(total / quantity);
  }
  const date = normalizeJalaliDate(row.date);
  const problems = [];
  if (!row.name?.trim()) problems.push("missing name");
  if (!(quantity > 0)) problems.push(`bad quantity "${row.quantity}"`);
  if (!(price >= 0)) problems.push(`bad price "${row.price}"`);
  if (!date) problems.push(`bad date "${row.date}"`);
  if (problems.length) return { problems };

  return {
    order: {
      name: row.name.trim(),
      quantity,
      price,
      date,
      delivery: row.delivery?.trim() || null,
      description: row.description?.trim() || null,
      status: STATUSES.includes(row.status) ? row.status : STATUSES[0],
      accounting: row.accounting === true,
      createdAt: row.created_at ?? new Date(),
    },
  };
}

async function importOrders(client, table, side) {
  const { rows } = await source.query(
    `SELECT * FROM public.${table} ORDER BY created_at, id`,
  );
  let imported = 0;
  for (const row of rows) {
    const { order, problems } = convertOrder(row);
    if (!order) {
      console.warn(`  skipped ${table}#${row.id}: ${problems.join(", ")}`);
      continue;
    }
    await client.query(
      `INSERT INTO orders (side, name, quantity, unit_price, jalali_date,
                           delivery, description, status, accounting, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        side,
        order.name,
        order.quantity,
        order.price,
        order.date,
        order.delivery,
        order.description,
        order.status,
        order.accounting,
        order.createdAt,
      ],
    );
    imported++;
  }
  console.log(`  ${table} → ${side}: ${imported}/${rows.length} rows imported`);
}

async function importUsers(client) {
  const { rows } = await source.query(
    `SELECT email, encrypted_password, created_at
       FROM auth.users
      WHERE email IS NOT NULL AND encrypted_password IS NOT NULL
        AND encrypted_password <> ''`,
  );
  let imported = 0;
  for (const u of rows) {
    const res = await client.query(
      `INSERT INTO users (email, password_hash, created_at)
       VALUES (lower($1), $2, $3)
       ON CONFLICT ((lower(email))) DO NOTHING`,
      [u.email, u.encrypted_password, u.created_at],
    );
    imported += res.rowCount;
  }
  console.log(`  auth.users → users: ${imported}/${rows.length} imported`);
}

async function main() {
  await migrate({ log: () => {} });
  await source.connect();

  const client = await target.connect();
  try {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM orders");
    if (rows[0].n > 0) {
      throw new Error("Target `orders` table is not empty — aborting to avoid duplicates.");
    }

    await client.query("BEGIN");
    console.log("Importing from Supabase…");
    await importUsers(client);
    await importOrders(client, "buy", "buy");
    await importOrders(client, "tasks", "sell");
    await client.query("COMMIT");
    console.log("Done.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.end().catch(() => {});
    await target.end();
  });
