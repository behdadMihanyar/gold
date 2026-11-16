import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestsApi } from "../api/market";
import { clockTime, fmtQty, fmtRial, jalaliDate, toLatinDigits, toPersianDigits } from "../utils/format";
import { Coin } from "./bits";
import { Check } from "./icons";
import { usePanel } from "./PanelContext";

// crypto.randomUUID needs HTTPS; getRandomValues also works over plain HTTP.
function uuid() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseQty = (text) => {
  const t = toLatinDigits(text).replace("٫", ".").trim();
  return /^\d+(\.\d{1,3})?$/.test(t) ? Number(t) : NaN;
};

const ERRORS = {
  PRICES_STALE: "قیمت‌ها در این لحظه به‌روز نیستند. چند لحظه بعد دوباره تلاش کنید.",
  NOT_AVAILABLE: "این محصول فعلاً برای این عملیات موجود نیست.",
  TOO_MANY_PENDING: "چند درخواست بی‌پاسخ دارید. پس از پاسخ ادمین دوباره تلاش کنید.",
  BAD_QUANTITY: "مقدار واردشده مجاز نیست.",
  RATE_LIMITED: "درخواست‌های پشت‌سرهم زیاد بود. کمی صبر کنید.",
};

export default function ProductSheet({ product: p, stale, onClose }) {
  const { reload, bump } = usePanel();
  const navigate = useNavigate();
  const first = p.buyPrice !== null ? "buy" : "sell";
  const [side, setSide] = useState(first);
  const [qtyText, setQtyText] = useState(toPersianDigits(String(p.minQuantity).replace(".", "٫")));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const key = useRef(uuid());

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const price = side === "buy" ? p.buyPrice : p.sellPrice;
  const qty = parseQty(qtyText);
  const qtyProblem = useMemo(() => {
    if (!Number.isFinite(qty) || qty <= 0) return "مقدار را وارد کنید.";
    if (qty < p.minQuantity) return `حداقل مقدار ${fmtQty(p.minQuantity)} ${p.unit} است.`;
    if (qty > p.maxQuantity) return `حداکثر مقدار ${fmtQty(p.maxQuantity)} ${p.unit} است.`;
    if (Math.round(qty * 1000) % Math.round(p.step * 1000) !== 0) return `مقدار باید مضرب ${fmtQty(p.step)} باشد.`;
    return "";
  }, [qty, p]);
  const total = price && !qtyProblem ? Math.round(qty * price) : null;
  const setQty = (n) => setQtyText(toPersianDigits(String(round3(n)).replace(".", "٫")));
  const nudge = (dir) => {
    const base = Number.isFinite(qty) ? qty : p.minQuantity;
    setQty(Math.min(p.maxQuantity, Math.max(p.minQuantity, base + dir * p.step)));
  };
  const chips = (p.step < 1 ? [0.5, 1, 5, 10] : [1, 2, 5, 10]).filter(
    (n) => n >= p.minQuantity && n <= p.maxQuantity && Math.round(n * 1000) % Math.round(p.step * 1000) === 0,
  );

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await requestsApi.create({
        productId: p.id, side, quantity: qty, quotedPrice: price,
        note: note.trim() || undefined, clientKey: key.current,
      });
      bump();
      setDone(r);
    } catch (e) {
      if (e.code === "PRICE_CHANGED") {
        reload();
        setError("قیمت همین الان تغییر کرد. قیمت جدید را بررسی و دوباره تأیید کنید.");
        key.current = uuid();
      } else {
        setError(ERRORS[e.code] ?? (e.status === 0 || !e.status ? "ارتباط با سرور برقرار نشد." : e.message || "ثبت درخواست ناموفق بود."));
        if (e.status && e.status < 500) key.current = uuid();
      }
    } finally {
      setBusy(false);
    }
  }

  const label = side === "buy" ? "خرید" : "فروش";
  return (
    <div className="gp-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`gp-sheet ${side}`} role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="gp-grab" />
        <div className="gp-sheet-head">
          <Coin code={p.code} />
          <div><h2>{p.name}</h2><small>واحد: {p.unit}</small></div>
          <button className="gp-x" onClick={onClose} aria-label="بستن">×</button>
        </div>

        {done ? (
          <div className="gp-done">
            <div className="tick"><Check /></div>
            <h3>درخواست ثبت شد</h3>
            <div className="gp-sub">پس از پاسخ ادمین، همین‌جا به شما اطلاع می‌دهیم.</div>
            <div className="gp-receipt num">
              <div><span>شماره درخواست</span><b>{toPersianDigits(done.id)}</b></div>
              <div><span>نوع</span><b>{done.side === "buy" ? "خرید" : "فروش"} {fmtQty(done.quantity)} {done.unit}</b></div>
              <div><span>قیمت واحد</span><b>{fmtRial(done.unitPrice)} ریال</b></div>
              <div><span>مبلغ کل</span><b>{fmtRial(done.total)} ریال</b></div>
              <div><span>زمان ثبت</span><b>{jalaliDate(done.createdAt)} — {clockTime(done.createdAt)}</b></div>
            </div>
            <button className={`gp-cta`} onClick={() => navigate("/requests")}>مشاهده درخواست‌ها</button>
            <button className="gp-ghost" onClick={onClose}>بستن</button>
          </div>
        ) : (
          <>
            <div className="gp-seg" role="tablist" aria-label="نوع معامله">
              <button role="tab" aria-selected={side === "buy"} className={`buy${side === "buy" ? " on" : ""}`} disabled={p.buyPrice === null} onClick={() => setSide("buy")}>
                <b>خرید</b><span className="num">{fmtRial(p.buyPrice)}</span>
              </button>
              <button role="tab" aria-selected={side === "sell"} className={`sell${side === "sell" ? " on" : ""}`} disabled={p.sellPrice === null} onClick={() => setSide("sell")}>
                <b>فروش</b><span className="num">{fmtRial(p.sellPrice)}</span>
              </button>
            </div>
            <div className="gp-hint">
              {side === "buy" ? "شما از قصر می‌خرید و این مبلغ را می‌پردازید." : "شما به قصر می‌فروشید و این مبلغ را دریافت می‌کنید."}
            </div>

            <label className="gp-label" htmlFor="qty">مقدار ({p.unit})</label>
            <div className="gp-qty">
              <button onClick={() => nudge(1)} aria-label="افزایش">+</button>
              <input id="qty" inputMode="decimal" autoComplete="off" value={qtyText} onChange={(e) => setQtyText(e.target.value)} aria-invalid={Boolean(qtyProblem)} />
              <button onClick={() => nudge(-1)} aria-label="کاهش">−</button>
            </div>
            <div className="gp-chips">
              {chips.map((n) => <button key={n} className="gp-chip" onClick={() => setQty(n)}>{fmtQty(n)}</button>)}
            </div>
            {qtyProblem && <div className="gp-hint" style={{ color: "var(--sell-d)" }}>{qtyProblem}</div>}

            <div className="gp-total">
              <small>مبلغ کل</small>
              <strong className="num">{total === null ? "—" : `${fmtRial(total)} ریال`}</strong>
            </div>

            <label className="gp-label" htmlFor="note">توضیحات (اختیاری)</label>
            <textarea id="note" className="gp-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً زمان تحویل" />

            {stale && <div className="gp-err">قیمت‌ها به‌روز نیستند؛ ثبت درخواست موقتاً غیرفعال است.</div>}
            {error && <div className="gp-err" role="alert">{error}</div>}
            <button className="gp-cta" disabled={busy || stale || !price || Boolean(qtyProblem)} onClick={submit}>
              {busy ? "در حال ثبت…" : `ثبت درخواست ${label}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
