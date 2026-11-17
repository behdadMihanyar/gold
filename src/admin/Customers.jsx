import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/market";
import "../panel/panel.css";
import { jalaliDate, toPersianDigits } from "../utils/format";

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(10));
  return [...b].map((x) => chars[x % chars.length]).join("");
}
const fieldError = (e, field) => e.details?.find((d) => d.field === field)?.message;

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // new customer form
  const [created, setCreated] = useState(null); // credentials to hand over
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(null);

  const load = useCallback(
    () =>
      adminApi
        .customers({ q: q.trim() || undefined, pageSize: 100 })
        .then((r) => setRows(r.data))
        .catch(() => {}),
    [q],
  );
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await adminApi.addCustomer({ username: form.username, fullName: form.fullName, phone: form.phone || null, password: form.password });
      setCreated({ username: form.username.toLowerCase(), password: form.password, name: form.fullName });
      setForm(null);
      load();
    } catch (ex) {
      setErr(
        fieldError(ex, "username") ??
          fieldError(ex, "fullName") ??
          fieldError(ex, "password") ??
          (ex.code === "DUPLICATE" ? "این نام کاربری قبلاً استفاده شده است." : ex.message),
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle(c) {
    if (c.isActive && !window.confirm(`دسترسی ${c.fullName} قطع شود؟`)) return;
    await adminApi.updateCustomer(c.id, { isActive: !c.isActive }).catch(() => {});
    load();
  }
  async function newPassword(c) {
    const password = genPassword();
    await adminApi.updateCustomer(c.id, { password });
    setReset({ name: c.fullName, username: c.username, password });
  }
  const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});

  const Creds = ({ c, onClose, title }) => (
    <div className="gp-banner warn" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <b>{title}</b>
      <div className="num" dir="ltr" style={{ textAlign: "left", fontFamily: "monospace", fontSize: 15 }}>
        {c.username}
        <br />
        {c.password}
      </div>
      <div className="gp-actions">
        <button className="gp-btn buy" onClick={() => copy(`نام کاربری: ${c.username}\nرمز عبور: ${c.password}`)}>
          کپی
        </button>
        <button className="gp-btn ghost" onClick={onClose}>
          بستن
        </button>
      </div>
      <small>این رمز فقط همین یک بار نمایش داده می‌شود؛ آن را برای مشتری بفرستید.</small>
    </div>
  );

  return (
    <div className="gp embed">
      <div className="gp-board-head">
        <div>
          <h1 className="gp-h1">مشتریان</h1>
          <p className="gp-sub" style={{ margin: 0 }}>
            برای هر مشتری یک حساب بسازید تا درخواست ثبت کند.
          </p>
        </div>
        <button
          className="gp-btn buy"
          onClick={() => {
            setCreated(null);
            setForm({ username: "", fullName: "", phone: "", password: genPassword() });
          }}>
          مشتری جدید
        </button>
      </div>
      {created && <Creds c={created} title={`حساب ${created.name} ساخته شد`} onClose={() => setCreated(null)} />}
      {reset && <Creds c={reset} title={`رمز جدید ${reset.name}`} onClose={() => setReset(null)} />}
      {form && (
        <form className="gp-card gp-form" onSubmit={add}>
          <label className="gp-field">
            نام و نام خانوادگی
            <input dir="rtl" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label className="gp-field">
            نام کاربری (انگلیسی)
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ali.rezaei"
              autoCapitalize="none"
            />
          </label>
          <label className="gp-field">
            تلفن (اختیاری)
            <input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="gp-field">
            رمز عبور
            <input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {err && <div className="gp-err">{err}</div>}
          <div className="gp-actions">
            <button className="gp-btn buy" disabled={busy}>
              ساخت حساب
            </button>
            <button
              type="button"
              className="gp-btn ghost"
              onClick={() => {
                setForm(null);
                setErr("");
              }}>
              انصراف
            </button>
          </div>
        </form>
      )}
      <input className="gp-input" style={{ margin: "12px 0" }} placeholder="جست‌وجوی مشتری" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 && <div className="gp-empty">مشتری‌ای پیدا نشد.</div>}
      {rows.map((c) => (
        <article key={c.id} className="gp-req" style={{ opacity: c.isActive ? 1 : 0.6 }}>
          <div className="gp-req-top">
            <div>
              <b>{c.fullName}</b>
              <span className="gp-sub num" style={{ margin: 0 }} dir="ltr">
                {c.username}
                {c.phone ? ` · ${c.phone}` : ""}
              </span>
            </div>
            <span className={`gp-badge ${c.isActive ? "accepted" : "cancelled"}`}>{c.isActive ? "فعال" : "غیرفعال"}</span>
          </div>
          <div className="gp-when num">
            <span>عضویت: {jalaliDate(c.createdAt)}</span>
            <span>{toPersianDigits(c.totalRequests)} درخواست</span>
            {c.pendingRequests > 0 && <span>{toPersianDigits(c.pendingRequests)} در انتظار</span>}
          </div>
          <div className="gp-actions">
            <button className="gp-btn ghost" onClick={() => newPassword(c)}>
              رمز جدید
            </button>
            <button className={`gp-btn ${c.isActive ? "sell" : "buy"}`} onClick={() => toggle(c)}>
              {c.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
