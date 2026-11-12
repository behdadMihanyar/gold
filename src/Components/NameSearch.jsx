import React, { useEffect, useRef, useState } from "react";
import close from "../img/close.svg";
import { ordersApi } from "../api/orders";
import { useOrdersRealtime } from "../api/realtime";
import { defaultNames } from "../Customers/Customers";
import { averagePrice } from "../utils/format";

const MAX_ROWS = 500;
const EMPTY = { count: 0, quantity: 0, amount: 0 };

const STATUS_STYLES = {
  "تسویه نشده": "bg-red-500/20 text-red-300",
  "پرداخت شده": "bg-amber-500/20 text-amber-300",
  "تحویل شده": "bg-emerald-500/20 text-emerald-300",
};

const fmt = (n) => Number(n || 0).toLocaleString();

async function loadSide(side, name) {
  const [list, summary] = await Promise.all([
    ordersApi.list(side, { q: name, pageSize: MAX_ROWS }),
    ordersApi.summary(side, { q: name }),
  ]);
  return { rows: list.data, total: list.total, summary };
}

/** Search-by-customer modal: shows the customer's full buy/sell history. */
const NameSearch = ({ onClose }) => {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState(""); // the name actually searched
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("sell");
  const [sell, setSell] = useState(null);
  const [buy, setBuy] = useState(null);
  const requestId = useRef(0);

  const runSearch = async (name) => {
    const q = name.trim();
    if (!q) return;
    const id = ++requestId.current;
    setQuery(q);
    setLoading(true);
    setError("");
    try {
      const [s, b] = await Promise.all([loadSide("sell", q), loadSide("buy", q)]);
      if (id !== requestId.current) return; // a newer search started
      setSell(s);
      setBuy(b);
      // Open the tab that actually has orders.
      if (s.total === 0 && b.total > 0) setTab("buy");
      else if (b.total === 0 && s.total > 0) setTab("sell");
    } catch (err) {
      if (id !== requestId.current) return;
      console.error(err);
      setError("خطا در دریافت اطلاعات. دوباره تلاش کنید.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  // Keep the results current when anyone adds/edits/deletes an order.
  useOrdersRealtime(() => {
    if (query) runSearch(query);
  });

  // Close with Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSubmit = (e) => {
    e.preventDefault();
    runSearch(input);
  };

  const hasResults = sell && buy;
  const current = tab === "sell" ? sell : buy;
  const sellSum = sell?.summary ?? EMPTY;
  const buySum = buy?.summary ?? EMPTY;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header + search box */}
        <div className="p-5 sm:p-6 border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
            aria-label="بستن"
          >
            <img src={close} className="w-6 h-6" alt="بستن" />
          </button>

          <h3 className="text-xl font-bold mb-5 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            جستجوی مشتری
          </h3>

          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              list="customer-names"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="نام مشتری را وارد کنید..."
              className="flex-1 bg-slate-900/50 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              autoFocus
            />
            <datalist id="customer-names">
              {defaultNames.map((c) => (
                <option key={c.value} value={c.value} />
              ))}
            </datalist>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="sm:w-40 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition"
            >
              {loading ? "در حال جستجو..." : "جست و جو"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {error && <p className="text-center text-red-300">{error}</p>}

          {!hasResults && !error && (
            <p className="text-center text-slate-400 text-sm">
              نام مشتری را بنویسید تا تاریخچه خرید و فروش او نمایش داده شود.
            </p>
          )}

          {hasResults && sell.total === 0 && buy.total === 0 && !loading && (
            <p className="text-center text-slate-300">
              هیچ سفارشی برای «{query}» پیدا نشد.
            </p>
          )}

          {hasResults && (sell.total > 0 || buy.total > 0) && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <SummaryCard
                  title="فروش به مشتری"
                  color="from-rose-500/20 to-rose-500/5 border-rose-400/30"
                  s={sellSum}
                />
                <SummaryCard
                  title="خرید از مشتری"
                  color="from-emerald-500/20 to-emerald-500/5 border-emerald-400/30"
                  s={buySum}
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  ["sell", `فروش (${fmt(sell.total)})`],
                  ["buy", `خرید (${fmt(buy.total)})`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex-1 py-2 rounded-xl font-bold transition ${
                      tab === key
                        ? "bg-indigo-500 text-white shadow-lg"
                        : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {current.rows.length === 0 ? (
                <p className="text-center text-slate-400 py-6">
                  {tab === "sell" ? "فروشی" : "خریدی"} برای این مشتری ثبت نشده است.
                </p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-slate-900/60 text-slate-300">
                        <tr>
                          <th className="p-3">تاریخ</th>
                          <th className="p-3">نام</th>
                          <th className="p-3">تعداد</th>
                          <th className="p-3">قیمت واحد</th>
                          <th className="p-3">مبلغ کل</th>
                          <th className="p-3">وضعیت</th>
                          <th className="p-3">تحویل</th>
                          <th className="p-3">توضیحات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {current.rows.map((o) => (
                          <tr
                            key={o.id}
                            className="border-t border-slate-700/70 hover:bg-white/5"
                          >
                            <td className="p-3 whitespace-nowrap">{o.date}</td>
                            <td className="p-3">{o.name}</td>
                            <td className="p-3">{o.quantity}</td>
                            <td className="p-3 whitespace-nowrap">{o.price}</td>
                            <td className="p-3 whitespace-nowrap font-bold">{o.total}</td>
                            <td className="p-3">
                              <StatusBadge status={o.status} />
                            </td>
                            <td className="p-3">{o.delivery || "-"}</td>
                            <td className="p-3 max-w-48 truncate" title={o.description || ""}>
                              {o.description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-3">
                    {current.rows.map((o) => (
                      <div
                        key={o.id}
                        className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm"
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-bold">{o.date}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                          <span>تعداد: {o.quantity}</span>
                          <span>قیمت: {o.price}</span>
                          <span className="col-span-2 text-white font-bold">
                            مبلغ کل: {o.total} ریال
                          </span>
                          {o.delivery && <span className="col-span-2">تحویل: {o.delivery}</span>}
                          {o.description && (
                            <span className="col-span-2">توضیحات: {o.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {current.total > current.rows.length && (
                    <p className="text-center text-slate-400 text-xs mt-3">
                      {fmt(current.rows.length)} سفارش آخر از {fmt(current.total)} سفارش نمایش
                      داده شده است. جمع‌ها شامل همه سفارش‌ها هستند.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, color, s }) => (
  <div className={`bg-gradient-to-br ${color} border rounded-2xl p-4`}>
    <h4 className="font-bold mb-3 text-center">{title}</h4>
    <div className="grid grid-cols-2 gap-2 text-sm text-center">
      <Stat label="تعداد سفارش" value={fmt(s.count)} />
      <Stat label="تعداد سکه" value={`${fmt(s.quantity)} سکه`} />
      <Stat label="مبلغ کل" value={`${fmt(s.amount)} ریال`} />
      <Stat label="میانگین قیمت" value={`${averagePrice(s.amount, s.quantity)} ریال`} />
    </div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-black/20 rounded-xl p-2">
    <div className="text-slate-400 text-xs mb-1">{label}</div>
    <div className="font-bold">{value}</div>
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-slate-600/40 text-slate-300"
    }`}
  >
    {status || "-"}
  </span>
);

export default NameSearch;
