import { useCallback, useEffect, useState } from "react";
import { requestsApi } from "../api/market";
import { clockTime, fmtQty, fmtRial, jalaliDate, toPersianDigits } from "../utils/format";
import { SideTag, Status } from "./bits";
import { usePanel } from "./PanelContext";

const TABS = [["all", "همه"], ["pending", "در انتظار"], ["accepted", "تأیید شده"], ["rejected", "رد شده"], ["cancelled", "لغو شده"]];

export default function MyRequests() {
  const { rev, unseen, markSeen, bump } = usePanel();
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [fresh] = useState(() => new Set(unseen.map((r) => r.id))); // highlight what the bell announced

  const load = useCallback(async (pageNo, append) => {
    setLoading(true);
    try {
      const r = await requestsApi.list({ status, page: pageNo, pageSize: 15 });
      setRows((prev) => (append ? [...prev, ...r.data] : r.data));
      setTotal(r.total);
      setErr(false);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { setPage(1); load(1, false); }, [load, rev]);
  useEffect(() => { if (unseen.length) markSeen(); }, [unseen.length, markSeen]);

  async function cancel(id) {
    if (!window.confirm("این درخواست لغو شود؟")) return;
    try { await requestsApi.cancel(id); bump(); } catch { load(1, false); }
  }

  return (
    <>
      <h1 className="gp-h1">درخواست‌های من</h1>
      <p className="gp-sub">همهٔ درخواست‌های خرید و فروش با زمان ثبت و نتیجه.</p>
      <div className="gp-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={status === k} className={`gp-tab${status === k ? " on" : ""}`} onClick={() => setStatus(k)}>{l}</button>
        ))}
      </div>
      {err && <div className="gp-banner err">دریافت اطلاعات ناموفق بود. <button className="gp-link" onClick={() => load(1, false)}>تلاش دوباره</button></div>}
      {!loading && !err && rows.length === 0 && <div className="gp-empty">درخواستی در این بخش نیست.</div>}
      {rows.map((r) => (
        <article key={r.id} className={`gp-req ${r.side}${fresh.has(r.id) ? " fresh" : ""}`}>
          <div className="gp-req-top">
            <div><b><SideTag side={r.side} />{r.productName}</b></div>
            <Status status={r.status} />
          </div>
          <div className="gp-facts num">
            <div><span>مقدار</span><b>{fmtQty(r.quantity)} {r.unit}</b></div>
            <div><span>قیمت واحد</span><b>{fmtRial(r.unitPrice)}</b></div>
            <div><span>مبلغ کل (ریال)</span><b>{fmtRial(r.total)}</b></div>
          </div>
          <div className="gp-when num">
            <span>ثبت: {jalaliDate(r.createdAt)} — {clockTime(r.createdAt)}</span>
            {r.decidedAt && <span>پاسخ: {jalaliDate(r.decidedAt)} — {clockTime(r.decidedAt)}</span>}
            <span>شمارهٔ {toPersianDigits(r.id)}</span>
          </div>
          {r.customerNote && <div className="gp-msg"><span>توضیح شما: </span>{r.customerNote}</div>}
          {r.adminNote && <div className="gp-msg"><span>پیام ادمین: </span>{r.adminNote}</div>}
          {r.status === "pending" && <button className="gp-link" onClick={() => cancel(r.id)}>لغو درخواست</button>}
        </article>
      ))}
      {rows.length < total && (
        <button className="gp-more" disabled={loading} onClick={() => { setPage(page + 1); load(page + 1, true); }}>
          {loading ? "…" : "نمایش بیشتر"}
        </button>
      )}
    </>
  );
}
