import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../api/market";
import { API_URL } from "../api/client";
import "../panel/panel.css";
import { clockTime, jalaliDate, toPersianDigits } from "../utils/format";

const SHOT_URL = `${API_URL}/api/admin/collector/screenshot`;

const KEYS = [
  ["Enter", "Enter"],
  ["Tab", "Tab"],
  ["Backspace", "پاک کردن یک حرف"],
];

const when = (iso) => (iso ? `${jalaliDate(iso)} ساعت ${clockTime(iso)}` : "");

/** One line saying what the collector is doing, and how worried to be. */
function describe(state, down) {
  if (down) return ["err", "کالکتور روی سرور در حال اجرا نیست. روی سرور اجرا کنید:  systemctl restart gold-collector"];
  if (!state) return ["warn", "در حال دریافت وضعیت کالکتور…"];
  const auto = state.autoLogin ?? {};
  if (state.connected) {
    const n = state.rows ? ` (${toPersianDigits(state.rows)} محصول)` : "";
    return ["ok", `متصل است و قیمت‌ها زنده دریافت می‌شوند${n}.`];
  }
  if (auto.state === "working" || auto.state === "pending") return ["warn", "در حال ورود خودکار به حساب هنزایی…"];
  if (auto.state === "rejected") {
    return ["err", `هنزایی اطلاعات ورود را نپذیرفت${auto.message ? `: «${auto.message}»` : ""}. شماره و رمز را بررسی و دوباره ذخیره کنید.`];
  }
  if (state.loginPage && !auto.configured) {
    return ["err", "کالکتور از حساب هنزایی خارج است. شماره و رمز حساب را در پایین ذخیره کنید تا خودش وارد شود."];
  }
  if (auto.state === "error") {
    return ["warn", `ورود انجام نشد (احتمالاً مشکل شبکه). کالکتور خودش دوباره تلاش می‌کند${auto.nextTryAt ? `، حدود ساعت ${clockTime(auto.nextTryAt)}` : ""}.`];
  }
  return ["warn", "اتصال زنده به هنزایی برقرار نیست؛ کالکتور خودکار در حال برقراری دوباره است. تا آن موقع قیمتی به مشتریان نشان داده نمی‌شود."];
}

function AccountCard({ state, onChanged }) {
  const auto = state?.autoLogin ?? {};
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // [tone, text]

  const showForm = !auto.configured || editing;

  async function run(fn, ok) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(["ok", ok]);
      onChanged();
      return true;
    } catch (e) {
      setMsg(["err", e.code === "COLLECTOR_DOWN" ? "کالکتور روی سرور در حال اجرا نیست." : "انجام نشد؛ دوباره تلاش کنید."]);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    const done = await run(
      () => adminApi.collector("account", { username: username.trim(), password }),
      "ذخیره شد. کالکتور در صورت نیاز همین حالا وارد می‌شود.",
    );
    if (done) {
      setPassword("");
      setUsername("");
      setEditing(false);
      setShow(false);
    }
  }

  return (
    <section className="gp-acct" aria-labelledby="acct-h">
      <h2 id="acct-h">ورود خودکار به هنزایی</h2>
      <p className="gp-sub">
        هر بار که هنزایی کالکتور را از حساب خارج کند، کالکتور با همین اطلاعات خودش دوباره وارد می‌شود و
        دریافت قیمت‌ها بدون دخالت شما ادامه پیدا می‌کند.
      </p>

      {!showForm && (
        <>
          <div className="gp-acct-row">
            <span>
              حساب ذخیره‌شده: <b dir="ltr" className="num">{auto.username}</b>
            </span>
            {auto.lastSuccessAt && <span className="gp-sub" style={{ margin: 0 }}>آخرین ورود خودکار: {when(auto.lastSuccessAt)}</span>}
          </div>
          <div className="gp-actions">
            {!state?.connected && (
              <button className="gp-btn buy" disabled={busy} onClick={() => run(() => adminApi.collector("login-now"), "درخواست ورود فرستاده شد.")}>
                ورود همین حالا
              </button>
            )}
            <button className="gp-btn ghost" disabled={busy} onClick={() => { setEditing(true); setMsg(null); }}>
              تغییر شماره یا رمز
            </button>
            {confirmClear ? (
              <>
                <button
                  className="gp-btn sell"
                  disabled={busy}
                  onClick={async () => { await run(() => adminApi.collector("account/clear"), "اطلاعات ورود حذف شد."); setConfirmClear(false); }}
                >
                  بله، حذف شود
                </button>
                <button className="gp-btn ghost" disabled={busy} onClick={() => setConfirmClear(false)}>انصراف</button>
              </>
            ) : (
              <button className="gp-btn ghost" disabled={busy} onClick={() => setConfirmClear(true)}>حذف اطلاعات ورود</button>
            )}
          </div>
          {confirmClear && (
            <p className="gp-sub" style={{ marginTop: 8 }}>بدون این اطلاعات، اگر هنزایی از حساب خارج کند، ورود دوباره دستی خواهد بود.</p>
          )}
        </>
      )}

      {showForm && (
        <form className="gp-acct-form" onSubmit={save} autoComplete="off">
          <label className="gp-field">
            شماره همراه حساب هنزایی
            <input
              inputMode="tel"
              dir="ltr"
              required
              minLength={3}
              maxLength={64}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="09xxxxxxxxx"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="gp-field">
            رمز عبور هنزایی
            <span className="gp-pass">
              <input
                type={show ? "text" : "password"}
                dir="ltr"
                required
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                {show ? "پنهان" : "نمایش"}
              </button>
            </span>
          </label>
          <p className="gp-note">
            رمز فقط روی سرور خودتان، در پوشهٔ کالکتور و با دسترسی محدود، نگه داشته می‌شود و هیچ‌وقت دوباره در داشبورد
            نمایش داده یا به مرورگر فرستاده نمی‌شود.
          </p>
          <div className="gp-actions">
            <button className="gp-btn buy" disabled={busy || !username.trim() || !password}>
              {busy ? "در حال ذخیره…" : "ذخیره و ورود"}
            </button>
            {auto.configured && (
              <button type="button" className="gp-btn ghost" disabled={busy} onClick={() => { setEditing(false); setPassword(""); setUsername(""); }}>
                انصراف
              </button>
            )}
          </div>
        </form>
      )}
      {msg && <div className={`gp-banner ${msg[0]}`} style={{ marginTop: 12, marginBottom: 0 }} role="status">{msg[1]}</div>}
    </section>
  );
}

/** The collector's browser as a live picture, clickable and typeable. Polls only while open. */
function ManualControl({ state, open }) {
  const [shot, setShot] = useState(null);
  const [down, setDown] = useState(false);
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  const alive = useRef(false);
  const lastUrl = useRef(null);

  const refresh = useCallback((delay = 1200) => {
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
    if (!open) return undefined;
    alive.current = true;
    refresh(0);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [open, refresh]);
  useEffect(() => () => lastUrl.current && URL.revokeObjectURL(lastUrl.current), []);

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
    const x = Math.round((e.clientX - rect.left) * ((state?.width ?? img.naturalWidth) / rect.width));
    const y = Math.round((e.clientY - rect.top) * ((state?.height ?? img.naturalHeight) / rect.height));
    act("click", { x, y });
  }

  async function sendText(e) {
    e.preventDefault();
    if (!text) return;
    await act("type", { text }, secret ? "متن مخفی ارسال شد." : "متن ارسال شد.");
    setText("");
  }

  return (
    <>
      <p className="gp-sub">
        معمولاً لازم نیست. اگر هنزایی چیزی غیرعادی خواست (مثلاً تأیید یا پیام خاص)، از اینجا مرورگر کالکتور را ببینید و
        روی تصویر کلیک کنید یا متن بفرستید. در این مدت ورود خودکار چند ثانیه صبر می‌کند تا با کار شما تداخل نکند.
      </p>
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
        <button className="gp-btn ghost" disabled={busy} onClick={() => act("home", {})}>صفحهٔ اصلی هنزایی</button>
      </div>
      {msg && <p className="gp-sub" style={{ marginTop: 8 }}>{msg}</p>}
    </>
  );
}

export default function Collector() {
  const [state, setState] = useState(null);
  const [down, setDown] = useState(false);
  const [manual, setManual] = useState(false);

  const loadState = useCallback(
    () =>
      adminApi
        .collectorState()
        .then((s) => {
          setState(s);
          setDown(false);
        })
        .catch(() => setDown(true)),
    [],
  );
  useEffect(() => {
    loadState();
    const t = setInterval(loadState, 2500);
    return () => clearInterval(t);
  }, [loadState]);

  const [tone, text] = describe(state, down);
  return (
    <div className="gp embed">
      <h1 className="gp-h1">اتصال به هنزایی</h1>
      <p className="gp-sub">قیمت‌ها از حساب شما در هنزایی خوانده و لحظه‌ای برای مشتریان به‌روز می‌شود.</p>

      <div className={`gp-banner ${tone}`} role="status" aria-live="polite">
        <span>
          {text}
          {state?.lastCheck && !down && <small className="gp-banner-time"> آخرین بررسی {clockTime(state.lastCheck)}</small>}
        </span>
      </div>

      {!down && state && <AccountCard state={state} onChanged={loadState} />}

      <details className="gp-manual" open={manual} onToggle={(e) => setManual(e.currentTarget.open)}>
        <summary>کنترل دستی مرورگر کالکتور</summary>
        <ManualControl state={state} open={manual} />
      </details>
    </div>
  );
}
