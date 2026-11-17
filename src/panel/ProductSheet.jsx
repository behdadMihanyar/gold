import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const t = toLatinDigits(text).replace("٫", ".").replace("/", ".").trim();
  return /^\d+(\.\d{1,3})?$/.test(t) ? Number(t) : NaN;
};
const showQty = (n) => toPersianDigits(String(round3(n)).replace(".", "٫"));
const isMultiple = (n, step) => Math.round(n * 1000) % Math.round(step * 1000) === 0;

const ERRORS = {
  PRICES_STALE: "قیمت‌ها در این لحظه به‌روز نیستند. چند لحظه بعد دوباره تلاش کنید.",
  NOT_AVAILABLE: "این محصول فعلاً برای این عملیات موجود نیست.",
  TOO_MANY_PENDING: "چند درخواست بی‌پاسخ دارید. پس از پاسخ ادمین دوباره تلاش کنید.",
  BAD_QUANTITY: "مقدار واردشده مجاز نیست.",
  RATE_LIMITED: "درخواست‌های پشت‌سرهم زیاد بود. کمی صبر کنید.",
};

/** Quick picks for the amount: weights for gold, counts for coins and bars. */
function presets(p) {
  const options =
    p.pricePer !== 1
      ? [
          { value: 1 },
          { value: p.pricePer, label: `۱ ${p.priceUnit}` },
          { value: 10 },
          { value: 50 },
          { value: 100 },
        ]
      : p.unit === "گرم"
        ? [{ value: 1 }, { value: 5 }, { value: 10 }, { value: 50 }, { value: 100 }]
        : [{ value: 1 }, { value: 2 }, { value: 5 }, { value: 10 }, { value: 20 }];
  return options.filter(
    (o) => o.value >= p.minQuantity && o.value <= p.maxQuantity && isMultiple(o.value, p.step),
  );
}

export default function ProductSheet({ product: p, stale, onClose }) {
  const { reload, bump } = usePanel();
  const navigate = useNavigate();
  const [side, setSide] = useState(p.buyPrice !== null ? "buy" : "sell");
  const [qtyText, setQtyText] = useState(() => showQty(p.pricePer !== 1 ? p.pricePer : Math.max(p.minQuantity, 1)));
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [closing, setClosing] = useState(false);
  const [moved, setMoved] = useState(null); // "up" | "down" briefly after a live price change
  const key = useRef(uuid());
  const qtyInput = useRef(null);

  const price = side === "buy" ? p.buyPrice : p.sellPrice;
  const isWeight = p.unit === "گرم";
  const converted = p.pricePer !== 1; // e.g. weight in grams, price per mithqal

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 180);
  }, [onClose]);

  // Escape closes; the page behind doesn't scroll while the sheet is open.
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  // With a mouse, start typing the amount right away (on phones this would pop the keyboard).
  useEffect(() => {
    if (window.matchMedia?.("(pointer: fine)").matches) qtyInput.current?.select();
  }, []);

  // Live price changes while the sheet is open: show it, so nobody is surprised.
  const lastPrice = useRef(price);
  useEffect(() => {
    if (lastPrice.current !== null && price !== null && price !== lastPrice.current) {
      setMoved(price > lastPrice.current ? "up" : "down");
      const t = setTimeout(() => setMoved(null), 2500);
      lastPrice.current = price;
      return () => clearTimeout(t);
    }
    lastPrice.current = price;
  }, [price]);

  const qty = parseQty(qtyText);
  const qtyProblem = useMemo(() => {
    if (!Number.isFinite(qty) || qty <= 0) return isWeight ? "وزن را وارد کنید." : "تعداد را وارد کنید.";
    if (qty < p.minQuantity) return `حداقل ${fmtQty(p.minQuantity)} ${p.unit}.`;
    if (qty > p.maxQuantity) return `حداکثر ${fmtQty(p.maxQuantity)} ${p.unit}.`;
    if (!isMultiple(qty, p.step)) return p.step >= 1 ? "عدد صحیح وارد کنید." : `مقدار باید مضرب ${fmtQty(p.step)} باشد.`;
    return "";
  }, [qty, p, isWeight]);
  const total = price && !qtyProblem ? Math.round((qty * price) / p.pricePer) : null;

  const setQty = (n) => {
    setQtyText(showQty(n));
    setError("");
  };
  const nudge = (dir) => {
    const stepBy = Math.max(p.step, 1);
    const base = Number.isFinite(qty) ? qty : p.minQuantity;
    setQty(Math.min(p.maxQuantity, Math.max(p.minQuantity, round3(base + dir * stepBy))));
  };

  async function submit(e) {
    e?.preventDefault();
    if (busy || stale || !price || qtyProblem) return;
    setBusy(true);
    setError("");
    try {
      const r = await requestsApi.create({
        productId: p.id, side, quantity: qty, quotedPrice: price,
        note: note.trim() || undefined, clientKey: key.current,
      });
      bump();
      setDone(r);
    } catch (err) {
      if (err.code === "PRICE_CHANGED") {
        reload();
        setError("قیمت همین الان تغییر کرد. قیمت جدید را ببینید و دوباره «ثبت» را بزنید.");
        key.current = uuid();
      } else {
        setError(ERRORS[err.code] ?? (!err.status ? "ارتباط با سرور برقرار نشد." : err.message || "ثبت درخواست ناموفق بود."));
        if (err.status && err.status < 500) key.current = uuid();
      }
    } finally {
      setBusy(false);
    }
  }

  const sideLabel = side === "buy" ? "خرید" : "فروش";
  const amountLabel = isWeight ? "وزن" : "تعداد";
  return (
    <div
      className={`gp-scrim${closing ? " out" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className={`gp-sheet ${side}${closing ? " out" : ""}`} role="dialog" aria-modal="true" aria-label={p.name}>
        <div className="gp-grab" />
        <div className="gp-sheet-head">
          <Coin code={p.code} />
          <div>
            <h2>{p.name}</h2>
            <small>قیمت‌ها برای هر {p.priceUnit}</small>
          </div>
          <button className="gp-x" onClick={close} aria-label="بستن">×</button>
        </div>

        {done ? (
          <div className="gp-done">
            <div className="tick"><Check /></div>
            <h3>درخواست {done.side === "buy" ? "خرید" : "فروش"} ثبت شد</h3>
            <div className="gp-sub">به‌محض پاسخ ادمین، همین‌جا خبرتان می‌کنیم.</div>
            <div className="gp-receipt num">
              <div><span>شمارهٔ درخواست</span><b>{toPersianDigits(done.id)}</b></div>
              <div><span>{amountLabel}</span><b>{fmtQty(done.quantity)} {done.unit}</b></div>
              <div><span>قیمت هر {done.priceUnit}</span><b>{fmtRial(done.unitPrice)} ریال</b></div>
              <div><span>مبلغ کل</span><b>{fmtRial(done.total)} ریال</b></div>
              <div><span>زمان ثبت</span><b>{jalaliDate(done.createdAt)} — {clockTime(done.createdAt)}</b></div>
            </div>
            <button className="gp-cta" onClick={() => navigate("/requests")}>مشاهدهٔ درخواست‌ها</button>
            <button className="gp-ghost" onClick={close}>بستن</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="gp-seg" role="tablist" aria-label="نوع معامله">
              {[["buy", "خرید", p.buyPrice], ["sell", "فروش", p.sellPrice]].map(([s, label, value]) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={side === s}
                  className={`${s}${side === s ? " on" : ""}${side === s && moved ? ` moved-${moved}` : ""}`}
                  disabled={value === null}
                  onClick={() => { setSide(s); setError(""); }}
                >
                  <b>{label}</b>
                  <span className="num">{fmtRial(value)}</span>
                </button>
              ))}
            </div>
            <div className="gp-hint" aria-live="polite">
              {moved
                ? `قیمت همین الان ${moved === "up" ? "بالا" : "پایین"} رفت؛ مبلغ کل به‌روز شد.`
                : side === "buy"
                  ? "شما از قصر می‌خرید و این مبلغ را می‌پردازید."
                  : "شما به قصر می‌فروشید و این مبلغ را دریافت می‌کنید."}
            </div>

            <label className="gp-label" htmlFor="qty">{amountLabel} ({p.unit})</label>
            <div className="gp-qty">
              <button type="button" onClick={() => nudge(1)} aria-label="بیشتر">+</button>
              <div className="gp-qty-field">
                <input
                  id="qty"
                  ref={qtyInput}
                  inputMode="decimal"
                  autoComplete="off"
                  value={qtyText}
                  onChange={(e) => { setQtyText(e.target.value); setError(""); }}
                  onFocus={(e) => e.target.select()}
                  aria-invalid={Boolean(qtyProblem)}
                  aria-describedby="qty-help"
                />
                <span className="gp-qty-unit">{p.unit}</span>
              </div>
              <button type="button" onClick={() => nudge(-1)} aria-label="کمتر">−</button>
            </div>
            <div className="gp-presets" role="group" aria-label={`${amountLabel}های پرکاربرد`}>
              {presets(p).map((o) => {
                const on = Number.isFinite(qty) && round3(qty) === round3(o.value);
                return (
                  <button
                    type="button"
                    key={o.value}
                    className={`gp-preset${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setQty(o.value)}
                  >
                    {o.label ?? (
                      <>
                        {fmtQty(o.value)} <small>{p.unit}</small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <div id="qty-help" className={`gp-hint${qtyProblem ? " bad" : ""}`}>
              {qtyProblem ||
                (converted && Number.isFinite(qty)
                  ? `برابر ${showQty(qty / p.pricePer)} ${p.priceUnit} (هر ${p.priceUnit} = ${showQty(p.pricePer)} ${p.unit})`
                  : "")}
            </div>

            <div className="gp-total" aria-live="polite">
              <small>مبلغ کل</small>
              <strong className="num">{total === null ? "—" : `${fmtRial(total)} ریال`}</strong>
            </div>

            {showNote ? (
              <>
                <label className="gp-label" htmlFor="note">توضیحات</label>
                <textarea
                  id="note"
                  className="gp-note"
                  rows={2}
                  maxLength={300}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثلاً زمان یا نحوهٔ تحویل"
                  autoFocus
                />
              </>
            ) : (
              <button type="button" className="gp-addnote" onClick={() => setShowNote(true)}>
                + افزودن توضیح برای ادمین
              </button>
            )}

            <div className="gp-sheet-foot">
              {stale && <div className="gp-err">قیمت‌ها به‌روز نیستند؛ ثبت درخواست موقتاً ممکن نیست.</div>}
              {error && <div className="gp-err" role="alert">{error}</div>}
              <button className="gp-cta" disabled={busy || stale || !price || Boolean(qtyProblem)}>
                {busy ? "در حال ثبت…" : `ثبت درخواست ${sideLabel}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
