import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar } from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { adminApi } from "../api/market";
import { useSocketEvent, useSocketReconnect } from "../api/realtime";
import { SideTag, Status } from "../panel/bits";
import "../panel/panel.css";
import { clockTime, fmtQty, fmtRial, jalaliDate, toPersianDigits } from "../utils/format";

const TABS = [["all", "همه"], ["pending", "در انتظار"], ["accepted", "تأیید شده"], ["rejected", "رد شده"], ["cancelled", "لغو شده"]];

// Days are the shop's days (Iran time), sent to the API as Gregorian YYYY-MM-DD.
const tehranDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);
const shiftDay = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const jalaliLabel = (iso) =>
  new DateObject({ date: new Date(`${iso}T12:00:00Z`), calendar: persian, locale: persian_fa }).format("dddd D MMMM YYYY");

/** All days / today / yesterday / a day picked on a Jalali calendar. */
function DayFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const today = tehranDay();
  const yesterday = shiftDay(today, -1);
  const custom = value && value !== today && value !== yesterday;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const pick = (d) => {
    if (!d) return;
    onChange(d.convert(gregorian, gregorian_en).format("YYYY-MM-DD"));
    setOpen(false);
  };

  return (
    <div className="gp-days" ref={box} role="group" aria-label="تاریخ درخواست">
      <button type="button" className={`gp-chip${!value ? " on" : ""}`} aria-pressed={!value} onClick={() => onChange(null)}>همه روزها</button>
      <button type="button" className={`gp-chip${value === today ? " on" : ""}`} aria-pressed={value === today} onClick={() => onChange(today)}>امروز</button>
      <button type="button" className={`gp-chip${value === yesterday ? " on" : ""}`} aria-pressed={value === yesterday} onClick={() => onChange(yesterday)}>دیروز</button>
      <button type="button" className={`gp-chip${custom ? " on" : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">📅</span> {custom ? jalaliLabel(value) : <><span className="gp-wide">انتخاب </span>تاریخ</>}
      </button>
      {custom && (
        <button type="button" className="gp-chip-x" aria-label="حذف فیلتر تاریخ" onClick={() => onChange(null)}>×</button>
      )}
      {open && (
        <div className="gp-cal">
          <Calendar
            value={value ? new Date(`${value}T12:00:00Z`) : undefined}
            calendar={persian}
            locale={persian_fa}
            maxDate={new Date()}
            onChange={pick}
          />
        </div>
      )}
    </div>
  );
}

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
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [day, setDay] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const seq = useRef(0);
  const load = useCallback(async (pageNo = 1, append = false) => {
    const mine = ++seq.current; // a newer filter wins over a slower older answer
    setLoading(true);
    try {
      const date = day ?? undefined;
      const [r, s] = await Promise.all([
        adminApi.requests({ status, q: q.trim() || undefined, date, page: pageNo, pageSize: 15 }),
        adminApi.summary({ date }),
      ]);
      if (mine !== seq.current) return;
      setRows((prev) => (append ? [...prev, ...r.data] : r.data));
      setTotal(r.total);
      setCounts(s);
    } catch { /* keep what we have */ } finally { if (mine === seq.current) setLoading(false); }
  }, [status, q, day]);

  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1); }, 250); return () => clearTimeout(t); }, [load]);
  useSocketEvent("request:changed", () => load(1));
  useSocketReconnect(() => load(1));

  return (
    <div className="gp embed">
      <h1 className="gp-h1">درخواست‌های مشتریان</h1>
      <p className="gp-sub">درخواست‌های خرید و فروش را بررسی و تأیید یا رد کنید.</p>
      <input className="gp-input" type="search" style={{ marginBottom: 10 }} placeholder="جست‌وجو بر اساس نام مشتری یا محصول" value={q} onChange={(e) => setQ(e.target.value)} />
      <DayFilter value={day} onChange={setDay} />
      <div className="gp-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={status === k} className={`gp-tab${status === k ? " on" : ""}`} onClick={() => setStatus(k)}>
            {l}{counts[k] ? ` (${toPersianDigits(counts[k])})` : ""}
          </button>
        ))}
      </div>
      {day && (
        <p className="gp-sub num" style={{ margin: "0 2px 10px" }}>
          {loading ? "در حال جست‌وجو…" : `${toPersianDigits(total)} درخواست در ${jalaliLabel(day)}`}
        </p>
      )}
      {loading && rows.length === 0 && (
        <div aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="gp-skel gp-skel-req" />)}</div>
      )}
      {!loading && rows.length === 0 && (
        <div className="gp-empty">{day ? "در این روز درخواستی با این وضعیت ثبت نشده است." : "درخواستی در این بخش نیست."}</div>
      )}
      {rows.map((r) => <Card key={r.id} r={r} onDone={() => load(1)} />)}
      {rows.length < total && (
        <button className="gp-more" disabled={loading} onClick={() => { setPage(page + 1); load(page + 1, true); }}>نمایش بیشتر</button>
      )}
    </div>
  );
}
