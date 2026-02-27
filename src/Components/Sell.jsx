import React, { useEffect, useState } from "react";
import { useDataContext } from "../Context/DataContext";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";
import { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import supabase from "../supabase";
import {
  handleCancel,
  handleDelete,
  handleEdit,
  handleEditChange,
  handleUpdate,
  handleDateChange,
  getSalesDate,
  fetchTodayPrices,
} from "../utils/sellUpdate.js";
const Sell = () => {
  //States for sell
  const [searchValue, setSearchValue] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [allSellToday, setAllSellToday] = useState([]);
  const [allSell, setAllSell] = useState([]);
  const [filteredCoin, setFilteredCoin] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [search, setSearch] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
    status: "",
    accounting: false,
  });
  //Context
  const {
    isMobile,
    setIsMobile,
    pagebuy,
    setPagebuy,
    totalCount,
    setTotalCount,
    page,
    setPage,
    totalCountBuy,
    setTotalCountBuy,
  } = useDataContext();

  //fetch all sell orders
  const fetchAllOrders = async () => {
    const { data, error } = await supabase.from("tasks").select("*");
    if (error) {
      console.log(error.message);
    }
    setAllOrders(data);
  };

  //Sell 5 rows from SupaBase
  const PAGE_SIZE = 7;
  const fetchOrders = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    } else {
      setOrders(data || []);
      setTotalCount(count);
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalToadyCoin = allSellToday.map((item) => Number(item.quantity));
  const totalCoinsSoldToday = totalToadyCoin.reduce((sum, num) => sum + num, 0);

  //total coins all
  const getTotalToadyCoin = async () => {
    const { data, error } = await supabase.from("tasks").select("*");
    if (error) {
      console.log(error.message);
      return;
    }
    setAllSell(data);
  };
  const totalCoin = allSell.map((item) => Number(item.quantity));
  // const totalCoinsSold = totalCoin.reduce((sum, num) => sum + num, 0);
  const average = (totalPrice / totalCoinsSoldToday).toLocaleString();
  console.log(totalPrice);
  //filter by name
  const filterCoin = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchValue(value);

    // اگر سرچ خالی بود → برگرد به صفحه فعلی
    if (value.trim() === "") {
      setFilteredCoin(orders);
      return;
    }

    // اگر سرچ داشت → کل دیتابیس رو فیلتر کن
    const filtered = allOrders.filter((item) =>
      item.name.toLowerCase().includes(value)
    );

    setFilteredCoin(filtered);
  };
  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredCoin(orders);
    }
  }, [orders, searchValue]);
  useEffect(() => {
    fetchOrders();
    fetchAllOrders();
    getSalesDate(setAllSellToday);
    getTotalToadyCoin();
    fetchTodayPrices(setTotalPrice);
  }, [page]);

  //sound
  const insertSound = new Audio("/sounds/ui.mp3");
  const playSound = (type) => {
    if (type === "UPDATE") insertSound.play();
  };
  //realtime
  useEffect(() => {
    setFilteredCoin(orders);
  }, [orders]);
  useEffect(() => {
    const channel = supabase
      .channel("realtime-sell-table")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          console.log("Realtime Sell Change:", payload);
          playSound(payload.eventType);
          // Refresh current page
          fetchOrders();

          // Refresh totals
          getSalesDate(setAllSellToday);
          getTotalToadyCoin();
          fetchTodayPrices(setTotalPrice);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page]);

  //Loading ...
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-white">بارگذاری ...</div>
      </div>
    );
  }
  //Loading Error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-red-600">Error: {error}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="max-w-7xl mx-auto mt-10">
        <h2 className="text- font-bold text-gray-800 mb-8 text-center text-shadow-lg ">
          - لیست فروش -
        </h2>
        <div className="flex justify-start gap-25 flex-row items-center ">
          <div className="relative mb-8">
            <input
              type="text"
              value={searchValue}
              placeholder="جست و جو ..."
              onChange={filterCoin}
              className="
    w-72
    pr-10 pl-4 py-2
    rounded-2xl
    border-2 border-emerald-200
    bg-white
    shadow-sm
    text-gray-700
    placeholder-gray-400
    focus:outline-none
    focus:ring-2 focus:ring-emerald-400
    focus:border-bg-emerald-400
    transition-all duration-300
  "
            />

            <svg
              className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </div>
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-emerald-200 p-3 rounded-2xl ">
            تعداد کل امروز: {totalCoinsSoldToday} سکه
          </h2>
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-emerald-200 p-3 rounded-2xl ">
            مبلغ کل امروز : {totalPrice.toLocaleString()}ریال
          </h2>
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-emerald-200 p-3 rounded-2xl ">
            میانگین : {average} ریال
          </h2>
        </div>
        {filteredCoin.length === 0 ? (
          <div className="bg-white shadow-xl rounded-2xl p-12 text-center">
            <p className="text-xl text-gray-500">سفارشی ثبت نشده است ...</p>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% text-white">
                  <tr>
                    <th className="px-6 max-sm:py-1 py-3 text-center">ثبت</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">نام</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">تعداد</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">نرخ</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">
                      جمع کل
                    </th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">تاریخ</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">
                      تحویل دهنده
                    </th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">
                      توضیحات
                    </th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">وضعیت</th>
                    <th className="px-6 max-sm:py-1 py-3 text-center">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 max-sm:text-sm">
                  {filteredCoin.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50 transition`}
                    >
                      {editingId === order.id ? (
                        <>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            <input
                              type="checkbox"
                              className="ml-auto"
                              checked={order.accounting}
                              onChange={async (e) => {
                                const updatedValue = e.target.checked;

                                await supabase
                                  .from("tasks")
                                  .update({ accounting: updatedValue })
                                  .eq("id", order.id);

                                fetchOrders(); // refresh data
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              name="name"
                              value={editFormData.name}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="quantity"
                              value={editFormData.quantity}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="price"
                              value={editFormData.price}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData,
                                  setCalendarVisible
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              value={editFormData.total}
                              readOnly
                              className="w-full bg-gray-100 border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div
                              onClick={() =>
                                setCalendarVisible(!calendarVisible)
                              }
                              className="cursor-pointer"
                            >
                              {editFormData.date
                                ? editFormData.date
                                : order.date}
                            </div>

                            {calendarVisible && (
                              <Calendar
                                calendar={persian}
                                locale={persian_fa}
                                value={editFormData.date}
                                onChange={(e) =>
                                  handleDateChange(
                                    e,
                                    setEditFormData,
                                    editFormData,
                                    setCalendarVisible
                                  )
                                }
                              />
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="delivery"
                              value={editFormData.delivery}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="description"
                              value={editFormData.description}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <select
                              name="status"
                              value={editFormData.status}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormData,
                                  editFormData
                                )
                              }
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="تسویه نشده">تسویه نشده</option>
                              <option value="پرداخت شده">پرداخت شده</option>
                              <option value="تحویل شده">تحویل شده</option>
                            </select>
                          </td>

                          <td className="px-6 py-4 text-center flex justify-center">
                            <button
                              onClick={(e) =>
                                handleUpdate(
                                  order.id,
                                  setEditingId,
                                  editFormData,
                                  setFilteredCoin,
                                  filteredCoin
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              ذخیره
                            </button>

                            <button
                              onClick={() =>
                                handleCancel(
                                  setEditingId,
                                  setCalendarVisible,
                                  setEditFormData
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                            >
                              X
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            <input
                              type="checkbox"
                              className="ml-auto"
                              checked={order.accounting}
                              onChange={async (e) => {
                                const updatedValue = e.target.checked;

                                await supabase
                                  .from("tasks")
                                  .update({ accounting: updatedValue })
                                  .eq("id", order.id);

                                fetchOrders(); // refresh data
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.name}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.quantity}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.price}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.total}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.date}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.delivery || "-"}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            {order.description || "-"}
                          </td>
                          <td className="px-6 py-4 text-center max-sm:p-3">
                            <p
                              className={`px-3 py-1 rounded-full text-sm font-semibold text-center max-sm:p-3 ${
                                order.status === "تسویه نشده"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {order.status || "-"}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-center max-sm:p-3">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() =>
                                  handleEdit(
                                    order,
                                    setEditingId,
                                    setEditFormData
                                  )
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                ویرایش
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() =>
                                  handleDelete(
                                    order.id,
                                    filteredCoin,
                                    setFilteredCoin,
                                    getTotalToadyCoin
                                  )
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                حذف
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-2 flex justify-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className={`p-2 rounded ${
              page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"
            }`}
          >
            <GrLinkNext />
          </button>

          <span>{totalPages === 0 ? page : `${page} از ${totalPages}`}</span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className={`p-2 rounded ${
              page === totalPages
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-gray-200"
            }`}
          >
            <GrLinkPrevious />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sell;
