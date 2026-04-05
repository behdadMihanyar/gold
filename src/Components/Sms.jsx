import React, { useEffect, useState } from "react";
import supabase from "../supabase";
const Sms = () => {
  const [buy, setBuy] = useState([]);
  const [sell, setSell] = useState([]);
  const [buyLoading, setBuyLoading] = useState(true);
  const [sellLoading, setSellLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sell"); // "buy" or "sell"
  const data = activeTab === "sell" ? sell : buy;
  const getBuy = async () => {
    try {
      const { data, error } = await supabase
        .from("buy")
        .select("id,name,quantity,price,total,date,status")
        .order("created_at", { ascending: false });
      if (error) {
        console.log(error.message);
      }
      setBuy(data);
    } catch (err) {
      console.log(err.message);
    } finally {
      setBuyLoading(false);
    }
  };
  const getSell = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,name,quantity,price,total,date,status")
        .order("created_at", { ascending: false });
      if (error) {
        console.log(error.message);
      }
      setSell(data);
    } catch (error) {
      console.log(error.message);
    } finally {
      setSellLoading(false);
    }
  };
  useEffect(() => {
    getBuy();
    getSell();
  }, []);
  return (
    <div className="p-3">
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-1 rounded-full flex shadow-inner mt-10">
          <button
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
              activeTab === "sell"
                ? "bg-emerald-300 text-black shadow-md"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setActiveTab("sell")}
          >
            فروش
          </button>
          <button
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
              activeTab === "buy"
                ? "bg-emerald-300 text-black shadow-md"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setActiveTab("buy")}
          >
            خرید
          </button>
        </div>
      </div>
      <div>
        {buyLoading ? (
          <h3 className="text-center mt-50">بارگذاری ...</h3>
        ) : (
          <div className="rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="rounded-2xl bg-linear-to-r from-blue-400 to-emerald-300 text-white">
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">تعداد</th>
                  <th className="px-3 py-2">مبلغ</th>
                  <th className="px-3 py-2">مبلغ کل</th>
                  <th className="px-3 py-2">تاریخ</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">ارسال پیامک</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => {
                  return (
                    <tr
                      key={item.id}
                      className={`${index % 2 === 0 ? "bg-gray-200" : "bg-gray-100"} text-center`}
                    >
                      <td className="px-3 py-3 ">{item.name}</td>
                      <td className="px-3 py-3 ">{item.quantity}</td>
                      <td className="px-3 py-3 ">{item.price}</td>
                      <td className="px-3 py-3 ">{item.total}</td>
                      <td className="px-3 py-3 ">{item.date}</td>
                      <td className="px-3 py-3 ">{item.status}</td>
                      <td className="px-3 py-3 flex gap-3 text-center justify-center ">
                        <button className="p-2 text-sm bg-emerald-300 hover:bg-emerald-400 transition-all cursor-pointer rounded-2xl">
                          پیامک سفارش
                        </button>
                        <button className="p-2 text-sm bg-emerald-300 hover:bg-emerald-400 transition-all cursor-pointer  rounded-2xl">
                          پیامک تسویه
                        </button>
                        <button className="p-2 text-sm bg-emerald-300 hover:bg-emerald-400 transition-all cursor-pointer  rounded-2xl">
                          پیامک تحویل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sms;
