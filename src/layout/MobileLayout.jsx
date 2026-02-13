import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CiMenuBurger } from "react-icons/ci";
import { FaGithub } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import { GrPowerShutdown } from "react-icons/gr";
import supabase from "../supabase";
const MobileLayout = ({ show, setShow }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return (
    <div>
      <div>
        <main className="flex-1 p-3 bg-linear-to-br from-blue-50 to-purple-50 cursor-pointer">
          <button className="top-7 absolute" onClick={handleLogout}>
            <GrPowerShutdown color="black" size={30} />
          </button>
          <Outlet />
        </main>
        <div>
          {!show && (
            <div>
              <button
                className="p-3 absolute top-4 left-0 z-50 cursor-pointer"
                onClick={() => setShow(true)}
              >
                <CiMenuBurger color="black" size={30} />
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
