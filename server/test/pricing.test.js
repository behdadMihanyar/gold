// Opt-in: TEST_DATABASE_URL=postgres://... node --test test/pricing.test.js
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const URL = process.env.TEST_DATABASE_URL;

describe("grams for آبشده and admin markups (database)", { skip: URL ? false : "TEST_DATABASE_URL not set" }, () => {
  let svc, products, ingest, pool, customer, mithqal, coin;
  const id = async (code) => (await pool.query("SELECT id FROM products WHERE code = $1", [code])).rows[0].id;
  const board = async (code, admin = false) =>
    (await products.getBoard({ admin })).products.find((p) => p.code === code);

  before(async () => {
    process.env.DATABASE_URL = URL;
    process.env.JWT_SECRET ??= "x".repeat(40);
    svc = await import("../src/modules/requests/requests.service.js");
    products = await import("../src/modules/products/products.service.js");
    ingest = await import("../src/modules/prices/ingest.service.js");
    ({ pool } = await import("../src/db/pool.js"));
    await pool.query("UPDATE price_feed SET last_heartbeat_at = NULL, connected = false");
    await pool.query("UPDATE products SET source_id = NULL, buy_adjust = 0, sell_adjust = 0");
    customer = (await pool.query(
      `INSERT INTO users (username, password_hash, role, full_name)
       VALUES ($1, 'x', 'customer', 'Pricing Test') RETURNING id, role`,
      [`t_pricing_${Date.now().toString(36)}`],
    )).rows[0];
    mithqal = await id("mithqal-tomorrow");
    coin = await id("coin-full-86");
  });
  after(() => pool.end());

  test("آبشده: weight in grams, price per mithqal, total = grams × price / 4.608", async () => {
    await products.updateProduct(mithqal, { buyPrice: 106_160_000, sellPrice: 106_040_000 });
    const p = await board("mithqal-tomorrow");
    assert.equal(p.unit, "گرم");
    assert.equal(p.priceUnit, "مثقال");
    assert.equal(p.pricePer, 4.608);

    const { request } = await svc.createRequest(customer, {
      productId: mithqal, side: "buy", quantity: 9.216, quotedPrice: 106_160_000,
    });
    assert.equal(request.unit, "گرم");
    assert.equal(request.priceUnit, "مثقال");
    assert.equal(request.total, 2 * 106_160_000); // 9.216 g = 2 mithqal

    const odd = await svc.createRequest(customer, { productId: mithqal, side: "sell", quantity: 10.5 });
    assert.equal(odd.request.total, Math.round((10.5 * 106_040_000) / 4.608));

    await assert.rejects(
      svc.createRequest(customer, { productId: mithqal, side: "buy", quantity: 1.2345 }),
      (e) => e.code === "BAD_QUANTITY",
    );
  });

  test("markups: customers see and trade at source price ± adjustment", async () => {
    await products.updateProduct(coin, { buyPrice: 249_900_000, sellPrice: 249_450_000 });
    const admin = await products.updateProduct(coin, { buyAdjust: 500_000, sellAdjust: -300_000 });
    assert.equal(admin.baseBuyPrice, 249_900_000);
    assert.equal(admin.buyAdjust, 500_000);
    assert.equal(admin.buyPrice, 250_400_000);

    const p = await board("coin-full-86");
    assert.equal(p.buyPrice, 250_400_000);
    assert.equal(p.sellPrice, 249_150_000);
    assert.equal(p.buyAdjust, undefined, "customers never see the markup itself");

    // The raw source price is no longer accepted as a quote.
    await assert.rejects(
      svc.createRequest(customer, { productId: coin, side: "buy", quantity: 1, quotedPrice: 249_900_000 }),
      (e) => e.code === "PRICE_CHANGED" && e.data.currentPrice === 250_400_000,
    );
    const { request } = await svc.createRequest(customer, {
      productId: coin, side: "sell", quantity: 2, quotedPrice: 249_150_000,
    });
    assert.equal(request.unitPrice, 249_150_000);
    assert.equal(request.total, 498_300_000);

    const listed = await svc.listForAdmin({ status: "pending", page: 1, pageSize: 100 });
    assert.equal(listed.data.find((r) => r.id === request.id).marketPrice, 249_150_000);
  });

  test("markups follow every collector update", async () => {
    await products.updateProduct(coin, { sourceId: 58 });
    await ingest.applyIngest({ kind: "update", observedAt: new Date(Date.now() + 5000).toISOString(),
      products: [{ id: 58, buy: 251_000_000 }] });
    assert.equal((await board("coin-full-86")).buyPrice, 251_500_000);
  });

  test("a markup that would make the price zero or less means not available", async () => {
    await products.updateProduct(coin, { sellAdjust: -999_000_000_000 });
    assert.equal((await board("coin-full-86")).sellPrice, null);
    await assert.rejects(
      svc.createRequest(customer, { productId: coin, side: "sell", quantity: 1 }),
      (e) => e.code === "NOT_AVAILABLE",
    );
    await products.updateProduct(coin, { buyAdjust: 0, sellAdjust: 0, sourceId: null });
  });
});
