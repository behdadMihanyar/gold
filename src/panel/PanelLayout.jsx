import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import logo from "../img/logo.png";
import { clockTime, fmtQty, jalaliDate, toPersianDigits } from "../utils/format";
import { Bell, Check, Cross, Power } from "./icons";
import { PanelProvider, usePanel } from "./PanelContext";
import "./panel.css";

function Toasts() {
  const { toasts, dismissToast } = usePanel();
  const navigate = useNavigate();
  return (
    <div className="gp-toasts" aria-live="polite">
      {toasts.map(({ id, kind, request: r }) => (
        <div key={id} className={`gp-toast ${kind}`} role="status">
          <span className="ic">{kind === "accepted" ? <Check /> : <Cross />}</span>
          <div style={{ cursor: "pointer" }} onClick={() => { dismissToast(id); navigate("/requests"); }}>
            <b>{kind === "accepted" ? "درخواست شما تأیید شد" : "درخواست شما رد شد"}</b>
            <p>
              {r.side === "buy" ? "خرید" : "فروش"} {fmtQty(r.quantity)} {r.unit} {r.productName}
              {r.adminNote ? ` — ${r.adminNote}` : ""}
            </p>
          </div>
          <button className="close" onClick={() => dismissToast(id)} aria-label="بستن">×</button>
        </div>
      ))}
    </div>
  );
}

function BellMenu() {
  const { unseen, markSeen } = usePanel();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);
  return (
    <div ref={box} style={{ position: "relative" }}>
      <button className="gp-iconbtn" onClick={() => setOpen((o) => !o)} aria-label="اعلان‌ها" aria-expanded={open}>
        <Bell />
        {unseen.length > 0 && <span className="gp-dot">{toPersianDigits(unseen.length)}</span>}
      </button>
      {open && (
        <div className="gp-pop">
          <h4>
            اعلان‌ها
            {unseen.length > 0 && <button onClick={() => markSeen()}>همه را خواندم</button>}
          </h4>
          {unseen.length === 0 ? (
            <div className="none">اعلان تازه‌ای ندارید</div>
          ) : (
            <ul>
              {unseen.map((r) => (
                <li key={r.id}>
                  <button onClick={() => { markSeen([r.id]); setOpen(false); navigate("/requests"); }}>
                    <i className={r.status} />
                    <span>
                      <b>{r.status === "accepted" ? "تأیید شد" : "رد شد"}: </b>
                      {r.side === "buy" ? "خرید" : "فروش"} {fmtQty(r.quantity)} {r.productName}
                      <small>{jalaliDate(r.decidedAt)} · {clockTime(r.decidedAt)}{r.adminNote ? ` · ${r.adminNote}` : ""}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="gp">
      <header className="gp-bar">
        <div className="gp-bar-in">
          <div className="gp-brand">
            <img src={logo} alt="" />
            <span>سکه قصر<small>{user.fullName ?? user.username}</small></span>
          </div>
          <nav className="gp-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>بازار</NavLink>
            <NavLink to="/requests" className={({ isActive }) => (isActive ? "on" : "")}>درخواست‌ها</NavLink>
          </nav>
          <span className="gp-spacer" />
          <BellMenu />
          <button className="gp-iconbtn" aria-label="خروج" title="خروج" onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>
            <Power />
          </button>
        </div>
      </header>
      <main className="gp-main"><Outlet /></main>
      <Toasts />
    </div>
  );
}

export default function PanelLayout() {
  return (
    <PanelProvider>
      <Shell />
    </PanelProvider>
  );
}
