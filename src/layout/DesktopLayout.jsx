import React from "react";
import logout from "../img/logout.png";
import logo from "../img/logo.png";
import supabase from "../supabase";
import order from "../img/order.svg";
import search from "../img/search.svg";
import addorder from "../img/addorder.svg";
import sms from "../img/sms.svg";
import dollor from "../img/dollor.svg";
import coin from "../img/coin.svg";
import home from "../img/home.svg";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
const DesktopLayout = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const homeRoute = useLocation().pathname;
  console.log(homeRoute);
  return (
    <div>
      <div className="flex h-screen overflow-hidden ">
        <aside
          className={
            homeRoute === "/"
              ? `w-64 bg-gradient-to-b from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% text-whitep-4 flex flex-col`
              : `w-64 rounded-l-3xl bg-gradient-to-b from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% text-whitep-4 flex flex-col`
          }
        >
          <h2 className="text-xl font-bold mb-6 text-center mt-10 flex justify-center">
            <img src={logo} alt="سکه قصر" width={100} height={100} />
          </h2>

          <nav className="flex flex-col gap-4 flex-1 p-4 ">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex gap-1 no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black "
                  : "text-white flex gap-1 no-underline hover:scale-108 duration-200 mr-3 "
              }
            >
              <img src={home} className="w-7 h-7" alt="خانه" />
              خانه
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex gap-1 no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black "
                  : "text-white flex gap-1 no-underline hover:scale-108 duration-200 mr-3 "
              }
            >
              <img src={order} className="w-7 h-7" alt="سفارشات" />
              سفارشات
            </NavLink>

            <NavLink
              to="/addOrder"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex gap-1 no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black"
                  : "text-white flex gap-1 no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              <img src={addorder} className="w-7 h-7" alt="سفارشات" />
              افزودن سفارش
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex gap-1 no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black"
                  : "text-white flex gap-1 no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              <img src={search} className="w-7 h-7" alt="سفارشات" />
              جست و جو
            </NavLink>
            <NavLink
              to="/sms"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex gap-1 no-underline font-bold border-r-4 rounded-l-2xl border-gray-800 p-1 mr-3 shadow-2xl shadow-black"
                  : "text-white flex gap-1 no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              <img src={sms} className="w-7 h-7" alt="سفارشات" />
              پنل پیامکی
            </NavLink>
            <NavLink
              to="https://behdad.vercel.app/"
              className={({ isActive }) =>
                isActive
                  ? "text-gray-800 flex no-underline font-bold border-r-4 border-amber-600 p-1 mr-3 "
                  : "text-white flex no-underline hover:scale-108 duration-200 mr-3"
              }
            >
              <img src={dollor} className="w-7 h-7" alt="سفارشات" />
              نرخ ارز
            </NavLink>
            <NavLink
              to="https://behdad.vercel.app/gold"
              className={({ isActive }) =>
                isActive
                  ? "text-sky-400 flex no-underline mr-3"
                  : "text-white flex no-underline hover:scale-110 duration-200 mr-3"
              }
            >
              <img src={coin} className="w-7 h-7" alt="سفارشات" />
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DesktopLayout;
