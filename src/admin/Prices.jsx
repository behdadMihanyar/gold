import { useCallback, useEffect, useState } from "react";
import { marketApi, adminApi } from "../api/market";
import { useSocketEvent } from "../api/realtime";
import "../panel/panel.css";
import { clockTime, fmtRial, parseAmount, formatPrice as fp, toPersianDigits } from "../utils/format";

const formatPrice = (v) => (parseAmount(v) ? fp(v) : "");

function Row({ p, unmapped, onSaved }) {
  const [buy, setBuy] = useState(p.buyPrice ? formatPrice(p.buyPrice) : "");
  const [sell, setSell] = useState(p.sellPrice ? formatPrice(p.sellPrice) : "");
  const [src, setSrc] = useState(p.sourceId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { setBuy(p.buyPrice ? formatPrice(p.buyPrice) : ""); setSell(p.sellPrice ? formatPrice(p.sellPrice) : ""); setSrc(p.sourceId ?? ""); }, [p.buyPrice, p.sellPrice, p.sourceId]);

  async function save(patch) {
    setBusy(true); setMsg("");
    try { await adminApi.updateProduct(p.id, patch); setMsg("ذخیره شد"); onSaved(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  const dirty = parseAmount(buy) !== (p.buyPrice ?? 0) || parseAmount(sell) !== (p.sellPrice ?? 0);
  return (
    <article className="gp-req" style={{ opacity: p.isActive ? 1 : 0.6 }}>
      <div className="gp-req-top">
        <b>{p.name}<span className="gp-sub" style={{ margin: 0, display: "block" }}>{p.unit}</span></b>
        <span className="gp-when num">{p.updatedAt ? `آخرین تغییر ${clockTime(p.updatedAt)}` : "بدون قیمت"}</span>
      </div>
      <div className="gp-two">
        <label className="gp-field">می‌خرید (مشتری می‌پردازد)<input className="num" inputMode="numeric" value={buy} onChange={(e) => setBuy(formatPrice(e.target.value))} placeholder="ندارید" /></label>
        <label className="gp-field">می‌فروشید (مشتری دریافت می‌کند)<input className="num" inputMode="numeric" value={sell} onChange={(e) => setSell(formatPrice(e.target.value))} placeholder="ندارید" /></label>
      </div>
      <div className="gp-two">
        <label className="gp-field">شناسهٔ کالکتور<select value={src} onChange={(e) => { setSrc(e.target.value); save({ sourceId: e.target.value ? Number(e.target.value) : null }); }}>
          <option value="">بدون اتصال (دستی)</option>
          {p.sourceId && <option value={p.sourceId}>{toPersianDigits(p.sourceId)} (فعلی)</option>}
          {unmapped.map((u) => <option key={u.sourceId} value={u.sourceId}>{toPersianDigits(u.sourceId)} — {fmtRial(u.buyPrice)} / {fmtRial(u.sellPrice)}</option>)}
        </select></label>
      </div>
      <div className="gp-actions">
        <button className="gp-btn buy" disabled={busy || !dirty} onClick={() => save({ buyPrice: parseAmount(buy) || null, sellPrice: parseAmount(sell) || null })}>ذخیرهٔ قیمت</button>
        <button className="gp-btn ghost" disabled={busy} onClick={() => save({ isActive: !p.isActive })}>{p.isActive ? "پنهان کردن از مشتریان" : "نمایش به مشتریان"}</button>
        {msg && <span className="gp-sub" style={{ margin: 0 }}>{msg}</span>}
      </div>
    </article>
  );
}

export default function Prices() {
  const [board, setBoard] = useState({ products: [], unmappedFeedItems: [], feed: null });
  const load = useCallback(() => marketApi.board().then(setBoard).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useSocketEvent("prices:changed", load);
  const f = board.feed;
  return (
    <div className="gp embed">
      <h1 className="gp-h1">قیمت‌ها و محصولات</h1>
      <p className="gp-sub">
        {f?.mode === "feed"
          ? `کالکتور متصل است؛ آخرین پیام ${clockTime(f.lastHeartbeatAt)}. ${f.live ? "قیمت‌ها زنده‌اند." : "ارتباط قطع است و مشتریان نمی‌توانند درخواست ثبت کنند."}`
          : "کالکتوری متصل نشده است؛ قیمت‌ها را دستی وارد کنید."}
      </p>
      {board.unmappedFeedItems.length > 0 && (
        <div className="gp-banner warn">{toPersianDigits(board.unmappedFeedItems.length)} شناسه از کالکتور هنوز به محصولی وصل نشده است؛ در هر محصول از فهرست «شناسهٔ کالکتور» انتخاب کنید (با مقایسهٔ قیمت‌ها).</div>
      )}
      {board.products.map((p) => <Row key={p.id} p={p} unmapped={board.unmappedFeedItems} onSaved={load} />)}
    </div>
  );
}
