import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Context/AuthContext";
import logo from "./img/logo.png";
import "./panel/panel.css";

const MESSAGES = {
  401: "نام کاربری یا رمز عبور اشتباه است.",
  400: "نام کاربری و رمز عبور را کامل وارد کنید.",
  429: "تلاش‌های ورود زیاد بود. چند دقیقه بعد دوباره تلاش کنید.",
};

const LogIn = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(identifier.trim(), password);
      document.activeElement?.blur?.(); // let a phone drop the keyboard (and any zoom) before leaving
      navigate("/", { replace: true }); // "/" is the market for customers, the dashboard for admins
    } catch (err) {
      setError(MESSAGES[err.status] ?? "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gp gp-login">
      <form className="gp-login-card" onSubmit={submit}>
        <img src={logo} alt="سکه قصر" />
        <h1>ورود به سکه قصر</h1>
        <p>نام کاربری و رمز عبوری که از ما گرفته‌اید را وارد کنید.</p>
        <label className="gp-field">
          نام کاربری یا ایمیل
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
        </label>
        <label className="gp-field">
          رمز عبور
          <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <label className="gp-check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> نمایش رمز عبور
        </label>
        {error && <div className="gp-err" role="alert">{error}</div>}
        <button className="gp-cta" disabled={busy}>{busy ? "در حال ورود…" : "ورود"}</button>
      </form>
    </div>
  );
};
export default LogIn;
