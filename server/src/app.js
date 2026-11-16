import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { pricesRouter } from "./modules/prices/prices.routes.js";
import { adminProductsRouter, productsRouter } from "./modules/products/products.routes.js";
import { adminRequestsRouter, requestsRouter } from "./modules/requests/requests.routes.js";
import { ratesRouter } from "./modules/rates/rates.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // correct client IPs (rate limiting) behind a reverse proxy

  app.use(helmet());
  if (config.corsOrigins.length) {
    app.use(cors({ origin: config.corsOrigins, credentials: true }));
  }
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/rates", ratesRouter);
  app.use("/api/prices", pricesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/requests", requestsRouter);
  app.use("/api/admin/customers", customersRouter);
  app.use("/api/admin/requests", adminRequestsRouter);
  app.use("/api/admin/products", adminProductsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
