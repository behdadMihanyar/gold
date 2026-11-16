import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/market";
import { useSocketEvent, useSocketReconnect } from "../api/realtime";
import { SideTag, Status } from "../panel/bits";
import "../panel/panel.css";
import { clockTime, fmtQty, fmtRial, jalaliDate, toPersianDigits } from "../utils/format";

const TABS = [["pending", "در انتظار"], ["accepted", "تأیید شده"], ["rejected", "رد شده"], ["cancelled", "لغو شده"], ["all", "همه"]];

function Card({ r, onDone }) {
  const [mode, setMode] = useState(null); // "accept" | "reject"
  const [note, setNote] = useState("");
  const [ledger, setLedger] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const diff = r.marketPrice && r.marketPrice !== r.unitPrice ? r.marketPrice - r.unitPrice : 0;

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const body = { note: note.trim() || undefined };
      if (mode === "accept") await adminApi.accept(r.id, { ...body, recordInLedger: ledger });
      else await adminApi.reject(r.id, body);
      onDone();
    } catch (e) {
      setErr(e.code === "ALREADY_DECIDED" ? "این درخواست قبلاً پاسخ داده شده است." : e.message || "خطا");
      if (e.code === "ALREADY_DECIDED") onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`gp-req ${r.side}`}>
      <div className="gp-req-top">
        <div>
          <b><SideTag side={r.side} />{fmtQty(r.quantity)} {r.unit} {r.productName}</b>
          <span className="gp-sub" style={{ margin: 0 }}>
            {r.customer.name}{r.customer.phone ? ` — ${toPersianDigits(r.customer.phone)}` : ""}
          </span>
        </div>
        <Status status={r.status} />
      </div>
      <div className="gp-facts num">
        <div><span>قیمت ثبت‌شده (هر {r.priceUnit ?? r.unit})</span><b>{fmtRial(r.unitPrice)}</b></div>
        <div><span>مبلغ کل (ریال)</span><b>{fmtRial(r.total)}</b></div>
        <div>
          <span>قیمت بازار اکنون</span>
          <b>{r.marketPrice ? fmtRial(r.marketPrice) : "—"}</b>
          {r.status === "pending" && diff !== 0 && (
            <span style={{ color: "var(--sell-d)" }}>{diff > 0 ? "▲" : "▼"} {fmtRial(Math.abs(diff))} اختلاف</span>
          )}
        </div>
      </div>
      <div className="gp-when num">
        <span>ثبت: {jalaliDate(r.createdAt)} — {clockTime(r.createdAt)}</span>
        {r.decidedAt && <span>پاسخ: {jalaliDate(r.decidedAt)} — {clockTime(r.decidedAt)}</span>}
        <span>شمارهٔ {toPersianDigits(r.id)}</span>
        {r.ledgerOrderId && <span>ثبت‌شده در سفارشات</span>}
      </div>
      {r.customerNote && <div className="gp-msg"><span>توضیح مشتری: </span>{r.customerNote}</div>}
      {r.adminNote && <div className="gp-msg"><span>پیام شما: </span>{r.adminNote}</div>}

      {r.status === "pending" && !mode && (
        <div className="gp-actions">
          <button className="gp-btn buy" onClick={() => setMode("accept")}>تأیید</button>
          <button className="gp-btn sell" onClick={() => setMode("reject")}>رد</button>
        </div>
      )}
      {mode && (
        <div className="gp-decide">
          <input className="gp-input" placeholder={mode === "accept" ? "پیام به مشتری (اختیاری)" : "دلیل رد (اختیاری)"} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          {mode === "accept" && r.ledgerEligible && (
            <label className="gp-check"><input type="checkbox" checked={ledger} onChange={(e) => setLedger(e.target.checked)} /> ثبت در دفتر سفارشات</label>
          )}
          {err && <div className="gp-err">{err}</div>}
          <div className="gp-actions">
            <button className={`gp-btn ${mode === "accept" ? "buy" : "sell"}`} disabled={busy} onClick={go}>{busy ? "…" : mode === "accept" ? "تأیید نهایی" : "رد نهایی"}</button>
            <button className="gp-btn ghost" onClick={() => { setMode(null); setErr(""); }}>انصراف</button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Requests() {
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageNo = 1, append = false) => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        adminApi.requests({ status, q: q.trim() || undefined, page: pageNo, pageSize: 15 }),
        adminApi.summary(),
      ]);
      setRows((prev) => (append ? [...prev, ...r.data] : r.data));
      setTotal(r.total);
      setCounts(s);
    } catch { /* keep what we have */ } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1); }, 250); return () => clearTimeout(t); }, [load]);
  useSocketEvent("request:changed", () => load(1));
  useSocketReconnect(() => load(1));

  return (
    <div className="gp embed">
      <h1 className="gp-h1">درخواست‌های مشتریان</h1>
      <p className="gp-sub">درخواست‌های خرید و فروش را بررسی و تأیید یا رد کنید.</p>
      <input className="gp-input" style={{ marginBottom: 12 }} placeholder="جست‌وجو بر اساس نام مشتری یا محصول" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="gp-tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={`gp-tab${status === k ? " on" : ""}`} onClick={() => setStatus(k)}>
            {l}{k !== "all" && counts[k] ? ` (${toPersianDigits(counts[k])})` : ""}
          </button>
        ))}
      </div>
      {!loading && rows.length === 0 && <div className="gp-empty">درخواستی در این بخش نیست.</div>}
      {rows.map((r) => <Card key={r.id} r={r} onDone={() => load(1)} />)}
      {rows.length < total && (
        <button className="gp-more" disabled={loading} onClick={() => { setPage(page + 1); load(page + 1, true); }}>نمایش بیشتر</button>
      )}
    </div>
  );
}
