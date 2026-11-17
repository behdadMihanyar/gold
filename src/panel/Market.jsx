import { useEffect, useMemo, useState } from "react";
import { fmtRial, clockTime } from "../utils/format";
import { Coin } from "./bits";
import { usePanel } from "./PanelContext";
import ProductSheet from "./ProductSheet";

export default function Market() {
  const { products, loaded, failed, offline, pricesLive, flash, reload } = usePanel();
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
  // Not live → no prices at all, and no open order sheet with an old price in it.
  const hidden = loaded && !pricesLive;
  useEffect(() => {
    if (hidden) setOpenId(null);
  }, [hidden]);
  const last = products
    .map((p) => p.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <>
      <div className="gp-board-head">
        <div>
          <h1 className="gp-h1">سکه و طلا قصر</h1>
          <p className="gp-sub" style={{ margin: 0 }}>
            یک محصول را برای خرید یا فروش انتخاب کنید.
          </p>
        </div>
        <span className={`gp-live${hidden ? " off" : ""}`}>
          <i />
          {hidden ? "قیمت‌ها متوقف است" : last ? `به‌روزرسانی ${clockTime(last)}` : "زنده"}
        </span>
      </div>

      {hidden && !failed && (
        <div className="gp-banner warn" role="alert">
          <span>
            <b>قیمت‌ها موقتاً نمایش داده نمی‌شوند.</b>{" "}
            {offline
              ? "اتصال شما به سرور قطع شده است؛ به‌محض وصل شدن، قیمت‌های تازه خودکار نمایش داده می‌شوند."
              : "ارتباط با منبع قیمت برقرار نیست؛ به‌محض برقراری، قیمت‌ها خودکار نمایش داده می‌شوند."}
          </span>
        </div>
      )}
      {failed && (
        <div className="gp-banner err" role="alert">
          دریافت قیمت‌ها ناموفق بود.{" "}
          <button className="gp-link" onClick={reload}>
            تلاش دوباره
          </button>
        </div>
      )}
      {loaded && !failed && products.length === 0 && <div className="gp-empty">هنوز محصولی تعریف نشده است.</div>}
      {!loaded && (
        <div className="gp-group" aria-busy="true" aria-label="در حال دریافت قیمت‌ها">
          <div className="gp-card">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="gp-skel" />
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <section className="gp-group" key={g.name}>
          <h2 className="gp-group-title">{g.name}</h2>
          <div className="gp-card">
            <div className="gp-cols">
              <span />
              <span>بخرید</span>
              <span>بفروشید</span>
            </div>
            {g.items.map((p) => {
              const buy = hidden ? null : p.buyPrice;
              const sell = hidden ? null : p.sellPrice;
              const none = buy === null && sell === null;
              return (
                <button key={p.id} className="gp-row" disabled={none} onClick={() => setOpenId(p.id)}>
                  <span className="gp-pname">
                    <Coin code={p.code} />
                    <span>
                      <b>{p.name}</b>
                      <small>قیمت هر {p.priceUnit}</small>
                    </span>
                  </span>
                  <span data-l="بخرید" className={`gp-price num ${buy === null ? "none" : "buy"} ${hidden ? "" : flash[p.id] ?? ""}`}>
                    {hidden ? "—" : fmtRial(buy)}
                    {buy !== null && <small>تومان</small>}
                  </span>
                  <span data-l="بفروشید" className={`gp-price num ${sell === null ? "none" : "sell"} ${hidden ? "" : flash[p.id] ?? ""}`}>
                    {hidden ? "—" : fmtRial(sell)}
                    {sell !== null && <small>تومان</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {open && !hidden && <ProductSheet product={open} stale={!pricesLive} onClose={() => setOpenId(null)} />}
    </>
  );
}
