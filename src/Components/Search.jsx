import React, { useState } from "react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Calendar } from "react-multi-date-picker";
import supabase from "../supabase";

const Search = () => {
  const [date, setDate] = useState(null);
  const [open, setOpen] = useState(false);
  const [dataSell, setDataSell] = useState([]);
  const [dataBuy, setDataBuy] = useState([]);
  const [activeTab, setActiveTab] = useState("buy"); // "buy" or "sell"
  const data = activeTab === "buy" ? dataBuy : dataSell;
  //sell from supabase
  const getTableSell = async (formattedDate) => {
    const { error, data } = await supabase
      .from("tasks")
      .select("*")
      .eq("date", formattedDate);
    if (error) {
      console.log(error.message);
    }
    setDataSell(data);
  };

  //buy from supabase
  const getTableBuy = async (formattedDate) => {
    const { error, data } = await supabase
      .from("buy")
      .select("*")
      .eq("date", formattedDate);
    if (error) {
      console.log(error.message);
    }
    setDataBuy(data);
  };
  console.log(dataBuy);
  const handleDate = (value) => {
    const formattedDate = value.format("YYYY/MM/DD", { calendar: persian });
    setDate(formattedDate);
    setOpen(false); // close after selecting
    getTableSell(formattedDate);
    getTableBuy(formattedDate);
  };

  return (
    <div className="flex flex-col justify-center w-full">
      <div className="flex justify-center">
        {/* Button */}
        <button
          onClick={() => setOpen(!open)}
          className="px-4 py-2 hover:shadow-xl cursor-pointer w-full bg-linear-to-r from-orange-400 to-red-400 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          {date ? date : "انتخاب تاریخ"}
        </button>

        {/* Animated Calendar */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 mt-2 z-50 transform transition-all duration-300 ease-out
        ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        >
          <div className="bg-white p-3 rounded-xl shadow-xl border">
            <Calendar
              value={date}
              calendar={persian}
              locale={persian_fa}
              onChange={handleDate}
            />
          </div>
        </div>
      </div>
      <div>
        <div className="p-6">
          {/* Toggle Buttons */}
          <div className="flex justify-center mb-6 space-x-4 rtl:space-x-reverse">
            <button
              className={`px-4 py-2 rounded-full hover:cursor-pointer font-semibold transition ${
                activeTab === "buy"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => setActiveTab("buy")}
            >
              خرید
            </button>
            <button
              className={`px-4 py-2 rounded-full cursor-pointer font-semibold transition ${
                activeTab === "sell"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => setActiveTab("sell")}
            >
              فروش
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse shadow-lg rounded-xl overflow-hidden">
              <thead className="bg-gradient-to-r from-orange-600 to-orange-400 text-white sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    نام
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    تعداد
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    قیمت
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    جمع کل
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    تاریخ
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    تحویل
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    توضیحات
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wide">
                    وضعیت
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!data || data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-6 text-gray-500 italic"
                    >
                      هیچ سفارشی وجود ندارد ...
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 text-right">
                        {item.price.toLocaleString()} تومان
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {item.total.toLocaleString()} تومان
                      </td>
                      <td className="px-6 py-4 text-right">{item.date}</td>
                      <td className="px-6 py-4 text-right">
                        {item.delivery || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            item.status === "تسویه نشده"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
