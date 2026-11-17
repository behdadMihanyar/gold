import { z } from "zod";

// Load server/.env when present (Node >= 20.12). Real env vars always win.
try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on the environment */
}

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default(""),
  // Set to "false" only when the site is served over plain HTTP (no domain/SSL yet).
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  // Shared secret the price collector sends in `X-Qasr-Relay-Key`. Leave unset to
  // disable the ingest endpoint (prices are then edited by hand in the admin panel).
  PRICE_RELAY_KEY: z.string().min(24, "PRICE_RELAY_KEY must be at least 24 characters").optional(),
  // Customers cannot send requests when the price feed has been silent this long
  // (only once a collector has connected at least once). 0 turns the check off.
  FEED_STALE_SECONDS: z.coerce.number().int().min(0).default(30),
  // Local port of the collector's control server (admin "Collector" page).
  COLLECTOR_CONTROL_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  priceRelayKey: env.PRICE_RELAY_KEY ?? null,
  feedStaleSeconds: env.FEED_STALE_SECONDS,
  collectorControlPort: env.COLLECTOR_CONTROL_PORT,
  cookieSecure: env.COOKIE_SECURE
    ? env.COOKIE_SECURE === "true"
    : env.NODE_ENV === "production",
  authCookieName: "gold_session",
});
