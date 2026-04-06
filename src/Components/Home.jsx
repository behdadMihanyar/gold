import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import plus from "../img/plus.svg";
import name from "../img/searchbyname.svg";
import date from "../img/searchbydate.svg";
import close from "../img/close.svg";
import calendar from "../img/calendar.svg";
import { getSalesDate, fetchTodayPrices } from "../utils/sellUpdate.js";
const Home = () => {
  const navigate = useNavigate();
  const [showNameSearch, setShowNameSearch] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [allSellToday, setAllSellToday] = useState([]);
  const [totalPrice, setTotalPrice] = useState();
  useEffect(() => {
    fetchTodayPrices(setTotalPrice);
    getSalesDate(setAllSellToday);
  }, []);

  const totalToadyCoin = allSellToday.map((item) => Number(item.quantity));
  const totalCoinsSoldToday = totalToadyCoin.reduce((sum, num) => sum + num, 0);
  const average = (totalPrice / totalCoinsSoldToday).toLocaleString();
  // Set current date in Persian format
  useEffect(() => {
    const date = new Date().toLocaleDateString("fa-IR");
    setCurrentDate(date);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white selection:bg-purple-500 selection:text-white">
      {/* Background Decorative Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-2 max-w-5xl relative">
        {/* Header Section */}
        <header className="flex max-sm:mt-20 mt-5 justify-between items-center mb-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <img
                src={calendar}
                className="w-6 h-6 text-white"
                alt="Calendar"
              />
            </div>
            <h2 className="font-bold text-lg tracking-wide">{currentDate}</h2>
          </div>

          <button
            onClick={() => navigate("/addOrder")}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 font-medium"
          >
            <span>سفارش جدید</span>
            <img src={plus} className="w-5 h-5" alt="Add" />
          </button>
        </header>

        {/* Search Overlay Modal */}
        {showNameSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-6 rounded-3xl shadow-2xl relative transform transition-all scale-100">
              <button
                onClick={() => setShowNameSearch(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
              >
                <img src={close} className="w-6 h-6" alt="Close" />
              </button>

              <h3 className="text-xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                جستجوی مشتری
              </h3>

              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="نام مشتری را وارد کنید..."
                  className="w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  autoFocus
                />
                <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg transform transition hover:-translate-y-1">
                  جست و جو
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          className={`transition-all duration-500 ${showNameSearch ? "blur-sm opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          {/* Title Card */}
          <div className="text-center mb-10">
            <h1 className="text-3xl p-3 md:text-4xl font-extrabold text-transparent bg-clip-text text-white drop-shadow-sm">
              پنل مدیریت خرید و فروش سکه قصر
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              داشبورد مدیریتی و آمار فروش
            </p>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div
              onClick={() => setShowNameSearch(true)}
              className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl shadow-xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/30"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                  <img src={name} className="w-12 h-12" alt="Search Name" />
                </div>
                <h2 className="text-xl font-bold">جست و جو بر اساس نام</h2>
              </div>
            </div>

            <div
              onClick={() => navigate("/search")}
              className="group relative overflow-hidden bg-gradient-to-br from-cyan-600 to-teal-700 p-8 rounded-3xl shadow-xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/30"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                  <img src={date} className="w-12 h-12" alt="Search Date" />
                </div>
                <h2 className="text-xl font-bold">جست و جو بر اساس تاریخ</h2>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "فروش امروز", val: { totalCoinsSoldToday } },
              { title: "میانگین فروش امروز", val: { average } },
              { title: "خرید امروز", val: "xxxxxxxxx" },
              { title: "میانگین خرید امروز", val: "xxxxxxxxx" },
              { title: "سکه های فروخته شده", val: { totalToadyCoin } },
              { title: "سکه های خریداری شده", val: "xxxxxxxxx" },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group"
              >
                <h3 className="text-slate-300 text-sm text-center font-medium mb-2 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-2xl font-bold text-white text-center tracking-tight">
                  {item.val}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Custom Animations in Tailwind Config would be needed, or use style tag for simplicity */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Home;
