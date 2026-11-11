import pg from "pg";
import { config } from "../config.js";

// Return BIGINT (int8) columns as JS numbers. Amounts in rials stay far below
// Number.MAX_SAFE_INTEGER (~9 quadrillion), so this is safe and keeps the API simple.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export const query = (text, params) => pool.query(text, params);
