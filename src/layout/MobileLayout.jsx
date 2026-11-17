import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CiMenuBurger } from "react-icons/ci";
import { IoClose } from "react-icons/io5";
import { GrPowerShutdown } from "react-icons/gr";
import logo from "../img/logo.png";
import { useAdminPending } from "../admin/useAdminPending";
import { toPersianDigits } from "../utils/format";
import { useAuth } from "../Context/AuthContext";

const LINKS = [
  ["/", "خانه"],
  ["/orders", "سفارشات"],
  ["/addOrder", "افزودن سفارش"],
  ["/search", "جست و جو"],
  ["/requests", "درخواست مشتریان"],
  ["/customers", "مشتریان"],
  ["/prices", "قیمت‌ها"],
  ["/collector", "اتصال به هنزایی"],
  ["/sms", "پنل پیامکی"],
];

/**
 * Admin layout on phones: a slim bar that stays at the top (menu, brand, sign out)
 * and takes its own space, so page content never slides under its buttons.
 */
const MobileLayout = ({ show, setShow }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const pending = useAdminPending();
  const close = () => setShow(false);

  const handleLogout = async () => {
    close();
    await logout();
    navigate("/login", { replace: true });
  };

  // While the menu is open: no page scrolling behind it, and Escape closes it.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setShow(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [show, setShow]);

  return (
    <div className="min-h-dvh flex flex-col">
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 bg-slate-900/85 text-white backdrop-blur-md shadow-md"
        style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "calc(56px + env(safe-area-inset-top))" }}
      >
        <button
          className="grid place-items-center w-10 h-10 rounded-full bg-white/10 active:bg-white/20 relative"
          onClick={() => setShow(true)}
          aria-label="منو"
          aria-expanded={show}
        >
          <CiMenuBurger size={24} />
          {pending > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-black text-[11px] font-bold grid place-items-center">
              {toPersianDigits(pending)}
            </span>
          )}
        </button>
        <NavLink to="/" className="flex items-center gap-2 font-bold no-underline text-white">
          <img src={logo} alt="" className="w-8 h-8" />
          سکه قصر
        </NavLink>
        <button
          className="grid place-items-center w-10 h-10 rounded-full bg-white/10 active:bg-white/20"
          onClick={handleLogout}
          aria-label="خروج"
          title="خروج"
        >
          <GrPowerShutdown size={20} className="[&_path]:stroke-white" />
        </button>
      </header>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <div
        className={`fixed inset-0 z-40 bg-amber-500 flex flex-col transition-transform duration-300 ease-out ${
          show ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="منو"
        aria-hidden={!show}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-start p-3">
          <button className="grid place-items-center w-10 h-10 rounded-full bg-white/20 text-white" onClick={close} aria-label="بستن منو" tabIndex={show ? 0 : -1}>
            <IoClose size={26} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-1 pb-6">
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={close}
              tabIndex={show ? 0 : -1}
              className={({ isActive }) =>
                `text-xl no-underline px-6 py-2.5 rounded-2xl ${isActive ? "bg-white text-amber-700 font-bold" : "text-white"}`
              }
            >
              {label}
              {to === "/requests" && pending > 0 ? ` (${toPersianDigits(pending)})` : ""}
            </NavLink>
          ))}
          <button className="mt-4 flex items-center gap-2 text-white/90 text-lg px-6 py-2.5" onClick={handleLogout} tabIndex={show ? 0 : -1}>
            <GrPowerShutdown size={18} className="[&_path]:stroke-white" /> خروج
          </button>
        </nav>
      </div>
    </div>
  );
};

export default MobileLayout;
