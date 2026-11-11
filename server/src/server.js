import http from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { attachRealtime } from "./realtime/socket.js";

async function main() {
  await migrate({ log: (msg) => console.log(`[db] ${msg}`) });

  const server = http.createServer(createApp());
  const io = attachRealtime(server);

  server.listen(config.port, () => {
    console.log(`Gold API listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    // io.close() disconnects sockets and also closes the underlying HTTP server.
    io.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
