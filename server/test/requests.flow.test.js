// Opt-in: needs a throwaway database with all migrations applied.
//   TEST_DATABASE_URL=postgres://... node --test test/requests.flow.test.js
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const URL = process.env.TEST_DATABASE_URL;
const skip = URL ? false : "TEST_DATABASE_URL not set";

describe("request workflow (database)", { skip }, () => {
  let svc, products, ingest, pool, events;
  let customer, other, admin, coin;
  const key = () => crypto.randomUUID();

  before(async () => {
    process.env.DATABASE_URL = URL;
    process.env.JWT_SECRET ??= "x".repeat(40);
    process.env.PRICE_RELAY_KEY ??= "k".repeat(30);
    svc = await import("../src/modules/requests/requests.service.js");
    products = await import("../src/modules/products/products.service.js");
    ingest = await import("../src/modules/prices/ingest.service.js");
    ({ pool } = await import("../src/db/pool.js"));
    events = (await import("../src/realtime/events.js")).events;

    const q = (t, p) => pool.query(t, p);
    const tag = Date.now().toString(36);
    const mk = async (role, name) =>
      (await q(
        `INSERT INTO users (username, email, password_hash, role, full_name)
         VALUES ($1, $2, 'x', $3, $4) RETURNING id, role, full_name AS "fullName", username`,
        [role === "customer" ? `t_${name}_${tag}` : null, role === "admin" ? `${name}_${tag}@t.io` : null, role, name],
      )).rows[0];
    customer = await mk("customer", "alice");
    other = await mk("customer", "bob");
    admin = await mk("admin", "boss");

    await q("UPDATE products SET buy_price = NULL, sell_price = NULL, source_id = NULL WHERE code <> 'coin-full-86'");
    await q("DELETE FROM price_feed_items");
    await q("UPDATE price_feed SET last_heartbeat_at = NULL, connected = false");
    coin = (await q("SELECT id FROM products WHERE code = 'coin-full-86'")).rows[0].id;
    await products.updateProduct(coin, { buyPrice: 100_000_000, sellPrice: 98_000_000 });
  });
  after(() => pool.end());

  const make = (over = {}) =>
    svc.createRequest(customer, { productId: coin, side: "buy", quantity: 2, ...over });

  test("creates a request at the server's price and notifies admins", async () => {
    let evt;
    events.once("request:changed", (e) => (evt = e));
    const { request, created } = await make({ quotedPrice: 100_000_000 });
    assert.equal(created, true);
    assert.equal(request.unitPrice, 100_000_000);
    assert.equal(request.total, 200_000_000);
    assert.equal(request.status, "pending");
    assert.equal(evt.action, "created");
    assert.equal(evt.forAdmin.customer.name, "alice");
  });

  test("selling uses the sell price", async () => {
    const { request } = await make({ side: "sell" });
    assert.equal(request.unitPrice, 98_000_000);
  });

  test("price changed → 409 with the current price", async () => {
    await assert.rejects(make({ quotedPrice: 99_000_000 }), (e) => {
      assert.equal(e.status, 409);
      assert.equal(e.code, "PRICE_CHANGED");
      assert.equal(e.data.currentPrice, 100_000_000);
      return true;
    });
  });

  test("clientKey makes a double submit harmless", async () => {
    const clientKey = key();
    const a = await make({ clientKey });
    const b = await make({ clientKey });
    assert.equal(b.created, false);
    assert.equal(a.request.id, b.request.id);
  });

  test("quantity range and step are enforced", async () => {
    await assert.rejects(make({ quantity: 0.5 }), (e) => e.code === "BAD_QUANTITY");
    await assert.rejects(make({ quantity: 1.5 }), (e) => e.code === "BAD_QUANTITY");
    await assert.rejects(make({ quantity: 5000 }), (e) => e.code === "BAD_QUANTITY");
  });

  test("unavailable price and inactive product are refused", async () => {
    const mith = (await pool.query("SELECT id FROM products WHERE code='mithqal-tomorrow'")).rows[0].id;
    await assert.rejects(make({ productId: mith, quantity: 1 }), (e) => e.code === "NOT_AVAILABLE");
    await products.updateProduct(coin, { isActive: false });
    await assert.rejects(make(), (e) => e.status === 404);
    await products.updateProduct(coin, { isActive: true });
  });

  test("stale feed blocks requests; fresh feed allows them", async () => {
    await pool.query("UPDATE price_feed SET last_heartbeat_at = now() - interval '10 minutes', connected = true");
    await assert.rejects(make(), (e) => e.status === 503 && e.code === "PRICES_STALE");
    await pool.query("UPDATE price_feed SET last_heartbeat_at = now()");
    await make();
    await pool.query("UPDATE price_feed SET last_heartbeat_at = NULL, connected = false");
  });

  test("accept: decided once, customer notified, appears in unseen", async () => {
    const { request } = await make();
    let evt;
    events.once("request:changed", (e) => (evt = e));
    const done = await svc.acceptRequest(admin, request.id, { note: "ok" });
    assert.equal(done.status, "accepted");
    assert.equal(done.adminNote, "ok");
    assert.ok(done.decidedAt);
    assert.equal(evt.userId, customer.id);
    assert.equal(evt.forCustomer.status, "accepted");
    assert.ok((await svc.listUnseen(customer.id)).some((r) => r.id === request.id));
    assert.equal((await svc.listUnseen(other.id)).length, 0);
    await assert.rejects(svc.rejectRequest(admin, request.id, {}), (e) => e.code === "ALREADY_DECIDED");
    assert.equal(await svc.markSeen(customer.id, [request.id]), 1);
    assert.ok(!(await svc.listUnseen(customer.id)).some((r) => r.id === request.id));
  });

  test("two admins answering at once: exactly one wins", async () => {
    const { request } = await make();
    const res = await Promise.allSettled([
      svc.acceptRequest(admin, request.id, {}),
      svc.rejectRequest(admin, request.id, {}),
    ]);
    assert.equal(res.filter((r) => r.status === "fulfilled").length, 1);
  });

  test("customer can cancel only their own pending request", async () => {
    const { request } = await make();
    await assert.rejects(svc.cancelRequest(other, request.id), (e) => e.status === 404);
    assert.equal((await svc.cancelRequest(customer, request.id)).status, "cancelled");
    await assert.rejects(svc.cancelRequest(customer, request.id), (e) => e.code === "ALREADY_DECIDED");
    await assert.rejects(svc.acceptRequest(admin, request.id, {}), (e) => e.code === "ALREADY_DECIDED");
  });

  test("ledger mirror: customer buy → shop sells; fractions refused", async () => {
    const { request } = await make({ quantity: 3 });
    const done = await svc.acceptRequest(admin, request.id, { recordInLedger: true });
    assert.ok(done.ledgerOrderId);
    const o = (await pool.query("SELECT side, quantity, unit_price FROM orders WHERE id=$1", [done.ledgerOrderId])).rows[0];
    assert.equal(o.side, "sell");
    assert.equal(Number(o.quantity), 3);
    const mith = (await pool.query("SELECT id FROM products WHERE code='mithqal-tomorrow'")).rows[0].id;
    await products.updateProduct(mith, { buyPrice: 5_000_000, sellPrice: 4_900_000 });
    const frac = await make({ productId: mith, quantity: 0.5 });
    await assert.rejects(svc.acceptRequest(admin, frac.request.id, { recordInLedger: true }), (e) => e.code === "LEDGER_NOT_SUPPORTED");
    assert.equal((await svc.listForAdmin({ status: "all", page: 1, pageSize: 100 })).data.find((r) => r.id === frac.request.id).status, "pending");
  });

  test("lists: customers see only theirs; admin filters and counts", async () => {
    assert.equal((await svc.listForCustomer(other.id, { status: "all", page: 1, pageSize: 10 })).total, 0);
    const mine = await svc.listForCustomer(customer.id, { status: "all", page: 1, pageSize: 3 });
    assert.equal(mine.data.length, 3);
    assert.ok(mine.total > 3);
    const found = await svc.listForAdmin({ status: "pending", q: "alice", page: 1, pageSize: 100 });
    assert.ok(found.data.length > 0 && found.data.every((r) => r.status === "pending"));
    const s = await svc.adminSummary();
    assert.ok(s.pending > 0 && s.accepted > 0 && s.cancelled > 0);
  });

  test("collector ingest: snapshot maps by source_id, replays are ignored", async () => {
    await products.updateProduct(coin, { sourceId: 4242 });
    const ev = (price, at) => ({
      kind: "update", observedAt: at,
      products: [{ id: 4242, buy: price, sell: price - 1000 }],
    });
    const t1 = new Date().toISOString();
    await ingest.applyIngest(ev(101_000_000, t1));
    let row = (await pool.query("SELECT buy_price FROM products WHERE id=$1", [coin])).rows[0];
    assert.equal(row.buy_price, 101_000_000);
    await ingest.applyIngest(ev(1, new Date(Date.now() - 60_000).toISOString())); // older → ignored
    row = (await pool.query("SELECT buy_price FROM products WHERE id=$1", [coin])).rows[0];
    assert.equal(row.buy_price, 101_000_000);
  });
});
