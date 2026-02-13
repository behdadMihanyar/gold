import React from "react";
import logout from "../img/logout.png";
import logo from "../img/logo.png";
import supabase from "../supabase";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
const DesktopLayout = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return (
    <div>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-linear-to-b from-orange-400 to-red-400 text-whitep-4 flex flex-col rounded-l-4xl">
          <h2 className="text-xl font-bold mb-6 text-center mt-10 flex justify-center">
            <img src={logo} alt="سکه قصر" width={100} height={100} />
          </h2>

          <nav className="flex flex-col gap-4 flex-1 p-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "text-black no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black "
                  : "text-white no-underline hover:scale-108 duration-200 mr-3 "
              }
            >
              سفارشات
            </NavLink>

            <NavLink
              to="/addOrder"
              className={({ isActive }) =>
                isActive
                  ? "text-black no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black"
                  : "text-white no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              افزودن سفارش
            </NavLink>
            <NavLink
              to="https://behdad.vercel.app/"
              className={({ isActive }) =>
                isActive
                  ? "text-black no-underline font-bold border-r-4 border-amber-600 p-1 mr-3 "
                  : "text-white no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              نرخ ارز
            </NavLink>
            <NavLink
              to="https://behdad.vercel.app/gold"
              className={({ isActive }) =>
                isActive
                  ? "text-sky-400 no-underline mr-3"
                  : "text-white no-underline hover:scale-110 duration-200 mr-3"
              }
            >
              نرخ سکه
            </NavLink>

            <button
              onClick={handleLogout}
              className="mt-auto text-white py-2 px-4 rounded flex justify-center hover:scale-110 cursor-pointer transition duration-150"
            >
              <img src={logout} width={50} height={50} />
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DesktopLayout;
