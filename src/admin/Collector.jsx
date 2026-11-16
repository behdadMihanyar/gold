import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../api/market";
import { API_URL } from "../api/client";
import "../panel/panel.css";
import { clockTime, toPersianDigits } from "../utils/format";

const SHOT_URL = `${API_URL}/api/admin/collector/screenshot`;

const KEYS = [
  ["Enter", "Enter"],
  ["Tab", "Tab"],
  ["Backspace", "پاک کردن یک حرف"],
];

/**
 * Shows the price collector's browser (running on the server) as a live picture.
 * Click on the picture to click there; type in the box below to type into the
 * page. Used for the one-time hanzaeigold.ir login.
 */
export default function Collector() {
  const [shot, setShot] = useState(null); // object URL of the latest screenshot
  const [down, setDown] = useState(false);
  const [state, setState] = useState(null);
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  const alive = useRef(true);
  const lastUrl = useRef(null);

  // Screenshot loop: fetch the next one only after the previous arrived.
  const refresh = useCallback(async (delay = 1200) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(SHOT_URL, { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const url = URL.createObjectURL(await res.blob());
        if (!alive.current) return URL.revokeObjectURL(url);
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setShot(url);
        setDown(false);
        refresh(1200);
      } catch {
        if (!alive.current) return;
        setDown(true);
        refresh(4000);
      }
    }, delay);
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh(0);
    const loadState = () => adminApi.collectorState().then(setState).catch(() => setState(null));
    loadState();
    const t = setInterval(loadState, 3000);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      clearInterval(t);
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    };
  }, [refresh]);

  async function act(action, body, ok) {
    setBusy(true);
    setMsg("");
    try {
      await adminApi.collector(action, body);
      if (ok) setMsg(ok);
      refresh(250);
    } catch (e) {
      setMsg(e.code === "COLLECTOR_DOWN" ? "کالکتور روی سرور در حال اجرا نیست." : "انجام نشد، دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  function clickOnShot(e) {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const scaleX = (state?.width ?? img.naturalWidth) / rect.width;
    const scaleY = (state?.height ?? img.naturalHeight) / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    act("click", { x, y });
  }

  async function sendText(e) {
    e.preventDefault();
    if (!text) return;
    await act("type", { text }, secret ? "متن مخفی ارسال شد." : "متن ارسال شد.");
    setText("");
  }

  const live = state?.connected || state?.rows > 0;
  return (
    <div className="gp embed">
      <h1 className="gp-h1">اتصال کالکتور قیمت</h1>
      <p className="gp-sub">
        این تصویرِ زندهٔ مرورگرِ کالکتور روی سرور است. یک بار در هانزایی وارد شوید تا قیمت‌ها خودکار به‌روز شوند.
      </p>

      <div className={`gp-banner ${down ? "err" : live ? "ok" : "warn"}`} role="status">
        {down
          ? "کالکتور در دسترس نیست. روی سرور اجرا کنید:  systemctl restart gold-collector"
          : live
            ? `متصل است و قیمت‌ها دریافت می‌شوند${state?.rows ? ` (${toPersianDigits(state.rows)} محصول در صفحه)` : ""}.${state?.lastCheck ? ` آخرین بررسی ${clockTime(state.lastCheck)}` : ""}`
            : "هنوز وارد هانزایی نشده‌اید یا صفحهٔ قیمت‌ها باز نیست. مراحل زیر را انجام دهید."}
      </div>

      {!live && !down && (
        <ol className="gp-steps">
          <li>در تصویر زیر روی کادر «نام کاربری» (یا شماره موبایل) کلیک کنید.</li>
          <li>آن را در کادر پایین تصویر بنویسید و «ارسال متن» را بزنید.</li>
          <li>روی کادر رمز کلیک کنید، تیک «مخفی» را بزنید، رمز را بنویسید و بفرستید.</li>
          <li>دکمهٔ ورودِ سایت را در تصویر بزنید (یا «Enter»). اگر کد پیامکی خواست، همین‌طور واردش کنید.</li>
          <li>وقتی صفحهٔ قیمت‌ها را دیدید، کادر بالا سبز می‌شود. تمام!</li>
        </ol>
      )}

      <div className="gp-screen">
        {shot ? (
          <img src={shot} alt="مرورگر کالکتور" onClick={clickOnShot} draggable={false} />
        ) : (
          <div className="gp-empty">{down ? "تصویری در دسترس نیست." : "در حال دریافت تصویر…"}</div>
        )}
        {busy && <span className="gp-screen-busy">…</span>}
      </div>
      {state?.url && (
        <div className="gp-when" dir="ltr" style={{ justifyContent: "flex-end" }}>
          {state.url}
        </div>
      )}

      <form className="gp-typebar" onSubmit={sendText}>
        <input
          className="gp-input"
          type={secret ? "password" : "text"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="متنی که باید در کادر انتخاب‌شده تایپ شود"
          autoComplete="off"
          dir="auto"
        />
        <label className="gp-check">
          <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> مخفی
        </label>
        <button className="gp-btn buy" disabled={busy || !text}>ارسال متن</button>
      </form>

      <div className="gp-actions" style={{ marginTop: 10 }}>
        {KEYS.map(([key, label]) => (
          <button key={key} className="gp-btn ghost" disabled={busy} onClick={() => act("key", { key })}>{label}</button>
        ))}
        <button className="gp-btn ghost" disabled={busy} onClick={() => act("scroll", { dy: -500 })}>بالا</button>
        <button className="gp-btn ghost" disabled={busy} onClick={() => act("scroll", { dy: 500 })}>پایین</button>
        <button className="gp-btn ghost" disabled={busy} onClick={() => act("reload", {})}>بارگذاری دوباره</button>
        <button className="gp-btn ghost" disabled={busy} onClick={() => act("home", {})}>صفحهٔ اصلی هانزایی</button>
      </div>
      {msg && <p className="gp-sub" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
