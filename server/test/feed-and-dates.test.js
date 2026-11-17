// Opt-in: TEST_DATABASE_URL=postgres://... node --test test/feed-and-dates.test.js
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const URL = process.env.TEST_DATABASE_URL;

describe("prices hidden while the feed is down; requests by day (database)", { skip: URL ? false : "TEST_DATABASE_URL not set" }, () => {
  let svc, products, ingest, feedWatch, events, pool, customer, coin;
  const pushed = [];
  const heartbeat = (connected) =>
    ingest.applyIngest({ kind: "heartbeat", eventId: crypto.randomUUID(), connected, observedAt: new Date().toISOString() });

  before(async () => {
    process.env.DATABASE_URL = URL;
    process.env.JWT_SECRET ??= "x".repeat(40);
    svc = await import("../src/modules/requests/requests.service.js");
    products = await import("../src/modules/products/products.service.js");
    ingest = await import("../src/modules/prices/ingest.service.js");
    feedWatch = await import("../src/modules/products/feedWatch.js");
    events = await import("../src/realtime/events.js");
    ({ pool } = await import("../src/db/pool.js"));
    events.events.on(events.PRICES_CHANGED, (p) => pushed.push(p));
    await pool.query("UPDATE price_feed SET last_heartbeat_at = NULL, connected = false");
    await pool.query("UPDATE products SET source_id = NULL, buy_adjust = 0, sell_adjust = 0");
    customer = (await pool.query(
      `INSERT INTO users (username, password_hash, role, full_name)
       VALUES ($1, 'x', 'customer', 'Feed Test') RETURNING id, role`,
      [`t_feed_${Date.now().toString(36)}`],
    )).rows[0];
    coin = (await pool.query("SELECT id FROM products WHERE code = 'coin-full-86'")).rows[0].id;
    await products.updateProduct(coin, { buyPrice: 250_000_000, sellPrice: 249_500_000 });
  });
  after(async () => {
    feedWatch.stopFeedWatch();
    await pool.query("UPDATE price_feed SET last_heartbeat_at = NULL, connected = false");
    await pool.end();
  });

  test("feed down → customers get no prices (admins still see them); back → prices return", async () => {
    await feedWatch.checkFeed(); // remember the current state
    await heartbeat(true);
    let p = (await products.getBoard()).products.find((x) => x.id === coin);
    assert.equal(p.buyPrice, 250_000_000);

    pushed.length = 0;
    await heartbeat(false);
    const board = await products.getBoard();
    assert.equal(board.feed.live, false);
    p = board.products.find((x) => x.id === coin);
    assert.equal(p.buyPrice, null);
    assert.equal(p.sellPrice, null);
    const admin = (await products.getBoard({ admin: true })).products.find((x) => x.id === coin);
    assert.equal(admin.buyPrice, 250_000_000);

    // Screens were told at once, with masked prices.
    assert.equal(pushed.length, 1);
    assert.equal(pushed[0].feed.live, false);
    assert.equal(pushed[0].products.find((x) => x.id === coin).buyPrice, null);

    await assert.rejects(
      svc.createRequest(customer, { productId: coin, side: "buy", quantity: 1 }),
      (e) => e.code === "PRICES_STALE",
    );

    pushed.length = 0;
    await heartbeat(true);
    assert.equal(pushed.length, 1);
    assert.equal(pushed[0].feed.live, true);
    assert.equal(pushed[0].products.find((x) => x.id === coin).buyPrice, 250_000_000);
  });

  test("a silent collector also hides prices once FEED_STALE_SECONDS pass", async () => {
    await pool.query("UPDATE price_feed SET connected = true, last_heartbeat_at = now() - interval '10 minutes'");
    pushed.length = 0;
    await feedWatch.checkFeed();
    assert.equal(pushed.length, 1);
    assert.equal(pushed[0].feed.live, false);
    assert.equal((await products.getBoard()).products.find((x) => x.id === coin).buyPrice, null);
    await heartbeat(true);
  });

  test("admin list and counts filtered to one Iran-time day", async () => {
    const { request: a } = await svc.createRequest(customer, { productId: coin, side: "buy", quantity: 1 });
    const { request: b } = await svc.createRequest(customer, { productId: coin, side: "sell", quantity: 2 });
    // Two old days nobody else uses (earlier runs' rows are cleared first).
    // a: 23:30 Tehran on 1 Nov (= 20:00 UTC); b: 00:30 Tehran on 2 Nov (= 21:00 UTC on 1 Nov).
    await pool.query("DELETE FROM trade_requests WHERE created_at >= '2001-10-31' AND created_at < '2001-11-04' AND id NOT IN ($1, $2)", [a.id, b.id]);
    await pool.query("UPDATE trade_requests SET created_at = '2001-11-01T20:00:00Z' WHERE id = $1", [a.id]);
    await pool.query("UPDATE trade_requests SET created_at = '2001-11-01T21:00:00Z' WHERE id = $1", [b.id]);

    const day1 = await svc.listForAdmin({ status: "all", date: "2001-11-01", page: 1, pageSize: 50 });
    const day2 = await svc.listForAdmin({ status: "all", date: "2001-11-02", page: 1, pageSize: 50 });
    assert.deepEqual(day1.data.map((r) => r.id), [a.id]);
    assert.deepEqual(day2.data.map((r) => r.id), [b.id]);
    assert.equal(day1.total, 1);

    const pendingDay2 = await svc.listForAdmin({ status: "pending", date: "2001-11-02", page: 1, pageSize: 50 });
    assert.equal(pendingDay2.total, 1);
    const counts = await svc.adminSummary({ date: "2001-11-02" });
    assert.equal(counts.pending, 1);
    assert.equal(counts.all, 1);
    const allCounts = await svc.adminSummary();
    assert.ok(allCounts.all >= 2);
  });
});
