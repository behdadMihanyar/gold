import { useCallback, useEffect, useState } from "react";
import { adminApi, marketApi } from "../api/market";
import { useSocketEvent } from "../api/realtime";
import "../panel/panel.css";
import { clockTime, fmtRial, formatPrice as fp, parseAmount, toPersianDigits } from "../utils/format";

const formatPrice = (v) => (parseAmount(v) ? fp(v) : "");

/** Same rule as the server: base + markup, and nothing at or below zero. */
const effective = (base, adjust) => (base == null ? null : base + adjust > 0 ? base + adjust : null);

/** Signed amount: a +/− switch and the amount. */
function AdjustInput({ value, onChange, label }) {
  const negative = value < 0;
  const amount = Math.abs(value);
  return (
    <div className="gp-adjust" role="group" aria-label={label}>
      <div className="gp-sign">
        <button type="button" className={!negative ? "on plus" : ""} aria-pressed={!negative} onClick={() => onChange(amount)}>
          +
        </button>
        <button type="button" className={negative ? "on minus" : ""} aria-pressed={negative} onClick={() => onChange(-amount)}>
          −
        </button>
      </div>
      <input
        className="num"
        inputMode="numeric"
        dir="ltr"
        value={amount ? formatPrice(amount) : ""}
        placeholder="0"
        aria-label={`${label} (ریال)`}
        onChange={(e) => onChange((negative ? -1 : 1) * parseAmount(e.target.value))}
      />
    </div>
  );
}

function Row({ p, unmapped, onSaved }) {
  const linked = p.sourceId !== null;
  const [base, setBase] = useState({ buy: p.baseBuyPrice, sell: p.baseSellPrice });
  const [adj, setAdj] = useState({ buy: p.buyAdjust, sell: p.sellAdjust });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Follow live prices; keep unsaved markup edits.
  useEffect(() => setBase({ buy: p.baseBuyPrice, sell: p.baseSellPrice }), [p.baseBuyPrice, p.baseSellPrice]);
  useEffect(() => setAdj({ buy: p.buyAdjust, sell: p.sellAdjust }), [p.buyAdjust, p.sellAdjust]);

  const adjDirty = adj.buy !== p.buyAdjust || adj.sell !== p.sellAdjust;
  const baseDirty = !linked && (base.buy !== p.baseBuyPrice || base.sell !== p.baseSellPrice);

  async function save(patch, ok = "ذخیره شد.") {
    setBusy(true);
    setMsg("");
    try {
      await adminApi.updateProduct(p.id, patch);
      setMsg(ok);
      onSaved();
    } catch (e) {
      setMsg(e.code === "SOURCE_ID_TAKEN" ? "این شناسه به محصول دیگری وصل است." : "ذخیره نشد، دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  const saveAll = () =>
    save({
      buyAdjust: adj.buy,
      sellAdjust: adj.sell,
      ...(baseDirty ? { buyPrice: base.buy || null, sellPrice: base.sell || null } : {}),
    });

  const side = (key, title, hint) => {
    const shown = effective(base[key], adj[key]);
    return (
      <div className={`gp-pcol ${key}`}>
        <div className="gp-pcol-title">
          {title}
          <small>{hint}</small>
        </div>
        <div className="gp-pline">
          <span>{linked ? "قیمت هنزایی" : "قیمت پایه"}</span>
          {linked ? (
            <b className="num">{fmtRial(base[key])}</b>
          ) : (
            <input
              className="num"
              inputMode="numeric"
              dir="ltr"
              value={base[key] ? formatPrice(base[key]) : ""}
              placeholder="موجود نیست"
              onChange={(e) => setBase({ ...base, [key]: parseAmount(e.target.value) || null })}
            />
          )}
        </div>
        <div className="gp-pline">
          <span>افزایش / کاهش</span>
          <AdjustInput value={adj[key]} label={`تغییر قیمت ${title}`} onChange={(v) => setAdj({ ...adj, [key]: v })} />
        </div>
        <div className="gp-pline shown">
          <span>نمایش به مشتری</span>
          <b className="num">{shown === null ? "موجود نیست" : `${fmtRial(shown)} ریال`}</b>
        </div>
      </div>
    );
  };

  return (
    <article className="gp-req gp-prow" style={{ opacity: p.isActive ? 1 : 0.6 }}>
      <div className="gp-req-top">
        <div>
          <b>{p.name}</b>
          <span className="gp-sub" style={{ margin: 0, display: "block" }}>
            قیمت هر {p.priceUnit}
            {p.pricePer !== 1 ? ` — مشتری وزن را به ${p.unit} وارد می‌کند` : ""}
          </span>
        </div>
        <span className={`gp-badge ${linked ? "accepted" : "cancelled"}`}>
          {linked ? `متصل به هنزایی — شناسهٔ ${toPersianDigits(p.sourceId)}` : "قیمت دستی"}
        </span>
      </div>

      <div className="gp-pgrid">
        {side("buy", "می‌خرید", "مشتری می‌پردازد")}
        {side("sell", "می‌فروشید", "مشتری دریافت می‌کند")}
      </div>

      <div className="gp-actions">
        <button className="gp-btn buy" disabled={busy || !(adjDirty || baseDirty)} onClick={saveAll}>
          ذخیره
        </button>
        {(adjDirty || baseDirty) && (
          <button
            className="gp-btn ghost"
            disabled={busy}
            onClick={() => {
              setAdj({ buy: p.buyAdjust, sell: p.sellAdjust });
              setBase({ buy: p.baseBuyPrice, sell: p.baseSellPrice });
            }}>
            انصراف
          </button>
        )}
        <button
          className="gp-btn ghost"
          disabled={busy}
          onClick={() => save({ isActive: !p.isActive }, p.isActive ? "از مشتریان پنهان شد." : "به مشتریان نمایش داده می‌شود.")}>
          {p.isActive ? "پنهان کردن از مشتریان" : "نمایش به مشتریان"}
        </button>
        <span className="gp-when">{p.updatedAt ? `آخرین تغییر قیمت ${clockTime(p.updatedAt)}` : "هنوز قیمتی ندارد"}</span>
        {msg && (
          <span className="gp-sub" style={{ margin: 0 }} role="status">
            {msg}
          </span>
        )}
      </div>

      <details className="gp-link-src">
        <summary>اتصال به هنزایی</summary>
        <select
          value={p.sourceId ?? ""}
          disabled={busy}
          onChange={(e) => save({ sourceId: e.target.value ? Number(e.target.value) : null }, "اتصال ذخیره شد.")}>
          <option value="">بدون اتصال (قیمت دستی)</option>
          {linked && <option value={p.sourceId}>شناسهٔ {toPersianDigits(p.sourceId)} (فعلی)</option>}
          {unmapped.map((u) => (
            <option key={u.sourceId} value={u.sourceId}>
              {u.name ? `${u.name} — ` : ""}شناسهٔ {toPersianDigits(u.sourceId)} — {fmtRial(u.buyPrice)} / {fmtRial(u.sellPrice)}
            </option>
          ))}
        </select>
      </details>
    </article>
  );
}

export default function Prices() {
  const [board, setBoard] = useState({ products: [], unmappedFeedItems: [], feed: null });
  const load = useCallback(
    () =>
      marketApi
        .board()
        .then(setBoard)
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  useSocketEvent("prices:changed", load);
  const f = board.feed;
  return (
    <div className="gp embed">
      <h1 className="gp-h1">قیمت‌ها و محصولات</h1>
      <p className="gp-sub">
        {f?.mode === "feed"
          ? `کالکتور متصل است؛ آخرین پیام ${clockTime(f.lastHeartbeatAt)}. ${f.live ? "قیمت‌ها زنده‌اند." : "ارتباط قطع است و مشتریان نمی‌توانند درخواست ثبت کنند."}`
          : "کالکتوری متصل نشده است؛ قیمت‌ها را دستی وارد کنید."}{" "}
        با «افزایش / کاهش» می‌توانید مبلغی به قیمت هنزایی اضافه یا از آن کم کنید؛ مشتری قیمت نهایی را می‌بیند و با همان معامله می‌کند.
      </p>
      {board.unmappedFeedItems.length > 0 && (
        <div className="gp-banner warn">
          {toPersianDigits(board.unmappedFeedItems.length)} محصول هنزایی به‌طور خودکار به محصولی وصل نشد (نام‌ها یکسان نبود)؛ در محصول مربوط، بخش «اتصال به
          هنزایی» را باز کنید و آن را انتخاب کنید.
        </div>
      )}
      {board.products.map((p) => (
        <Row key={p.id} p={p} unmapped={board.unmappedFeedItems} onSaved={load} />
      ))}
    </div>
  );
}
