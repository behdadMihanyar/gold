import { Outlet, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import supabase from "../supabase";

function Layout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 558);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 558);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ================= MOBILE =================
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col overflow-x-hidden">
        <main className="flex-1 p-4 pb-24">
          <Outlet />
        </main>

        <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center p-4 bg-slate-800 text-white rounded-t-2xl shadow-lg">
          <NavLink to="/" className="no-underline">
            سفارشات
          </NavLink>
          <NavLink to="/addOrder" className="no-underline">
            افزودن
          </NavLink>
          <NavLink to="/contact" className="no-underline">
            تماس
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-slate-800 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-6 text-center">سکه قصر</h2>

        <nav className="flex flex-col gap-4 flex-1 p-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "text-orange-400 no-underline border-r-4 border-amber-600 p-1 "
                : "text-white no-underline hover:scale-108 duration-200 "
            }
          >
            سفارشات
          </NavLink>

          <NavLink
            to="/addOrder"
            className={({ isActive }) =>
              isActive
                ? "text-orange-400 no-underline border-r-4 border-amber-600 p-1  "
                : "text-white no-underline hover:scale-108 duration-200"
            }
          >
            افزودن سفارش
          </NavLink>
          <NavLink
            to="https://behdad.vercel.app/"
            className={({ isActive }) =>
              isActive
                ? "text-orange-400 no-underline border-r-4 border-amber-600 p-1  "
                : "text-white no-underline hover:scale-108 duration-200"
            }
          >
            نرخ ارز
          </NavLink>
          <NavLink
            to="https://behdad.vercel.app/gold"
            className={({ isActive }) =>
              isActive
                ? "text-sky-400 no-underline "
                : "text-white no-underline hover:scale-110 duration-200"
            }
          >
            نرخ سکه
          </NavLink>

          <button
            onClick={handleLogout}
            className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            خروج
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-slate-100 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
