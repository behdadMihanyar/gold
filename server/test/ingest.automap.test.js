// Opt-in: TEST_DATABASE_URL=postgres://... node --test test/ingest.automap.test.js
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const URL = process.env.TEST_DATABASE_URL;

describe("collector snapshot links products by name (database)", { skip: URL ? false : "TEST_DATABASE_URL not set" }, () => {
  let ingest, pool, events;
  const price = async (code) =>
    (await pool.query("SELECT source_id, buy_price, sell_price FROM products WHERE code = $1", [code])).rows[0];

  before(async () => {
    process.env.DATABASE_URL = URL;
    process.env.JWT_SECRET ??= "x".repeat(40);
    ingest = await import("../src/modules/prices/ingest.service.js");
    ({ pool } = await import("../src/db/pool.js"));
    events = (await import("../src/realtime/events.js")).events;
    await pool.query("UPDATE products SET source_id = NULL, buy_price = NULL, sell_price = NULL");
    await pool.query("DELETE FROM price_feed_items");
    // An admin already linked this one by hand; the collector must not change it.
    await pool.query("UPDATE products SET source_id = 900 WHERE code = 'coin-half-86'");
  });
  after(() => pool.end());

  test("first snapshot links matching names and fills prices; live updates follow", async () => {
    let pushed;
    events.once("prices:changed", (e) => (pushed = e));
    await ingest.applyIngest({
      kind: "snapshot",
      observedAt: new Date().toISOString(),
      products: [
        { id: 58, name: "سکه تمام 86", buy: 2584000000, sell: 2578000000 },   // word order + digits differ
        { id: 60, name: "نیم سکه ۸۶", buy: 1420000000, sell: 1411000000 },    // product already linked to 900
        { id: 66, name: "شمش نقره ۱۰۰۰ گرمی اماراتي", buy: 209500000, sell: 206800000 }, // Arabic ي
        { id: 75, name: "چیزی که در لیست ما نیست", buy: 1, sell: 1 },
        { id: 76, buy: 5, sell: 5 }, // no name → nothing to match
      ],
    });
    assert.deepEqual(await price("coin-full-86"), { source_id: 58, buy_price: 2584000000, sell_price: 2578000000 });
    assert.equal((await price("silver-1000-emirati")).source_id, 66);
    assert.equal((await price("coin-half-86")).source_id, 900);
    assert.equal((await price("coin-half-86")).buy_price, null);
    assert.ok(pushed.products.some((p) => p.code === "coin-full-86" && p.buyPrice === 2584000000));

    const names = (await pool.query("SELECT source_id, name FROM price_feed_items ORDER BY source_id")).rows;
    assert.equal(names.find((r) => r.source_id === 58).name, "سکه تمام 86");

    // A live websocket update (no name) right after moves the linked product at once.
    await ingest.applyIngest({ kind: "update", observedAt: new Date(Date.now() + 1000).toISOString(),
      products: [{ id: 58, buy: 2590000000 }] });
    assert.deepEqual(await price("coin-full-86"), { source_id: 58, buy_price: 2590000000, sell_price: 2578000000 });
  });

  test("an ambiguous name is never linked", async () => {
    await ingest.applyIngest({
      kind: "snapshot",
      observedAt: new Date(Date.now() + 2000).toISOString(),
      products: [
        { id: 89, name: "ربع سکه ۸۶", buy: 810000000, sell: 800000000 },
        { id: 90, name: "سکه ربع 86", buy: 811000000, sell: 801000000 },
      ],
    });
    assert.equal((await price("coin-quarter-86")).source_id, null);
  });
});
