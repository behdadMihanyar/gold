import { useMemo, useState } from "react";
import { fmtRial, clockTime } from "../utils/format";
import { Coin } from "./bits";
import { usePanel } from "./PanelContext";
import ProductSheet from "./ProductSheet";

export default function Market() {
  const { products, feed, loaded, failed, flash, reload } = usePanel();
  const [openId, setOpenId] = useState(null);

  const groups = useMemo(() => {
    const out = [];
    for (const p of products) {
      let g = out.find((x) => x.name === p.group);
      if (!g) out.push((g = { name: p.group, items: [] }));
      g.items.push(p);
    }
    return out;
  }, [products]);
  const open = products.find((p) => p.id === openId);
  const stale = feed && !feed.live;
  const last = products.map((p) => p.updatedAt).filter(Boolean).sort().at(-1);

  return (
    <>
      <div className="gp-board-head">
        <div>
          <h1 className="gp-h1">بازار سکه و طلا</h1>
          <p className="gp-sub" style={{ margin: 0 }}>روی یک محصول بزنید تا خرید یا فروش را انتخاب کنید.</p>
        </div>
        <span className={`gp-live${stale || failed ? " off" : ""}`}>
          <i />
          {failed ? "قطع ارتباط" : stale ? "قیمت‌ها به‌روز نیست" : last ? `به‌روزرسانی ${clockTime(last)}` : "زنده"}
        </span>
      </div>

      {stale && (
        <div className="gp-banner warn" role="alert">
          اتصال به منبع قیمت قطع است. تا برقراری دوباره، ثبت درخواست جدید ممکن نیست.
        </div>
      )}
      {failed && (
        <div className="gp-banner err" role="alert">
          دریافت قیمت‌ها ناموفق بود. <button className="gp-link" onClick={reload}>تلاش دوباره</button>
        </div>
      )}
      {loaded && !failed && products.length === 0 && <div className="gp-empty">هنوز محصولی تعریف نشده است.</div>}
      {!loaded && <div className="gp-empty">در حال دریافت قیمت‌ها…</div>}

      {groups.map((g) => (
        <section className="gp-group" key={g.name}>
          <h2 className="gp-group-title">{g.name}</h2>
          <div className="gp-card">
            <div className="gp-cols"><span /><span>می‌خرید</span><span>می‌فروشید</span></div>
            {g.items.map((p) => {
              const none = p.buyPrice === null && p.sellPrice === null;
              return (
                <button key={p.id} className="gp-row" disabled={none} onClick={() => setOpenId(p.id)}>
                  <span className="gp-pname">
                    <Coin code={p.code} />
                    <span><b>{p.name}</b><small>{p.unit}</small></span>
                  </span>
                  <span data-l="می‌خرید" className={`gp-price num ${p.buyPrice === null ? "none" : "buy"} ${flash[p.id] ?? ""}`}>
                    {fmtRial(p.buyPrice)}
                    {p.buyPrice !== null && <small>ریال</small>}
                  </span>
                  <span data-l="می‌فروشید" className={`gp-price num ${p.sellPrice === null ? "none" : "sell"} ${flash[p.id] ?? ""}`}>
                    {fmtRial(p.sellPrice)}
                    {p.sellPrice !== null && <small>ریال</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="gp-sub" style={{ marginTop: 18 }}>
        «می‌خرید» قیمتی است که شما برای خرید می‌پردازید و «می‌فروشید» قیمتی است که برای فروش دریافت می‌کنید. قیمت نهایی همان است که هنگام ثبت درخواست می‌بینید.
      </p>
      {open && <ProductSheet product={open} stale={stale} onClose={() => setOpenId(null)} />}
    </>
  );
}
