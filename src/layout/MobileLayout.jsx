import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CiMenuBurger } from "react-icons/ci";
import { FaGithub } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import { GrPowerShutdown } from "react-icons/gr";
import { useAuth } from "../Context/AuthContext";
const MobileLayout = ({ show, setShow }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div>
      <div>
        <main className="flex-1 cursor-pointer">
          <button
            className="top-3 right-3 p-2 absolute z-30 bg-white/90 rounded-full shadow-md"
            onClick={handleLogout}
            aria-label="خروج"
          >
            <GrPowerShutdown color="black" size={26} />
          </button>
          <Outlet />
        </main>
        <div>
          {!show && (
            <div>
              <button
                className="p-2 absolute top-3 left-3 z-50 cursor-pointer bg-white/90 rounded-full shadow-md"
                onClick={() => setShow(true)}
                aria-label="منو"
              >
                <CiMenuBurger color="black" size={26} />
              </button>
            </div>
          )}

          <div
            className={`fixed top-0 left-0 w-full h-screen bg-amber-500 z-40 flex items-center justify-center transform transition-all duration-500 ease-in-out ${
              show ? "translate-x-0 " : "-translate-x-full pointer-events-none"
            }`}
          >
            <ul className="flex flex-col items-center justify-center space-y-4 text-2xl text-white">
              <li>
                <NavLink to="/" onClick={() => setShow((prev) => !prev)}>
                  خانه
                </NavLink>
              </li>
              <li>
                <NavLink to="/orders" onClick={() => setShow((prev) => !prev)}>
                  سفارشات
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/addOrder"
                  onClick={() => setShow((prev) => !prev)}
                >
                  افزودن سفارش
                </NavLink>
              </li>
              <li>
                <NavLink to="/search" onClick={() => setShow((prev) => !prev)}>
                  جست و جو
                </NavLink>
              </li>
              <li>
                <NavLink to="/sms" onClick={() => setShow((prev) => !prev)}>
                  پنل پیامکی
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="https://behdad.vercel.app/"
                  onClick={() => setShow((prev) => !prev)}
                >
                  ارز
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="https://behdad.vercel.app/gold"
                  onClick={() => setShow((prev) => !prev)}
                >
                  سکه
                </NavLink>
              </li>

              <li
                className="mt-3 cursor-pointer"
                onClick={() => setShow((prev) => !prev)}
              >
                <IoArrowBack size={28} />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLayout;
