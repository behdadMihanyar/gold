import React, { useEffect, useState } from "react";
import { useDataContext } from "../Context/DataContext";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";
import supabase from "../supabase";
import { ToastContainer } from "react-toastify";
import {
  handleCancel,
  handleDelete,
  handleEdit,
  handleEditChange,
  handleUpdate,
  handleDateChange,
} from "../utils/buyUpdate.js";
import { Calendar, DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
const Buy = () => {
  //States for buy
  const [ordersBuy, setOrdersBuy] = useState([]);
  const [loadingBuy, setLoadingBuy] = useState(true);
  const [errorBuy, setErrorBuy] = useState(null);
  const [allBuyToday, setAllBuyToday] = useState([]);
  const [allBuy, setAllBuy] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [editingIdBuy, setEditingIdBuy] = useState(null);
  const [calendarVisibleBuy, setCalendarVisibleBuy] = useState(false);
  const [editFormDataBuy, setEditFormDataBuy] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
    status: "",
  });
  const [filteredCoin, setFilteredCoin] = useState([]);

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

  //Buy tables from supabase
  const PAGE_SIZE_BUY = 5;
  const fetchOrdersBuy = async () => {
    setLoadingBuy(true);
    const from = (pagebuy - 1) * PAGE_SIZE_BUY;
    const to = from + PAGE_SIZE_BUY - 1;

    const { data, count, error } = await supabase
      .from("buy")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    } else {
      setOrdersBuy(data || []);
      setTotalCountBuy(count);
      setFilteredCoin(data);
      setLoadingBuy(false);
    }
  };
  const totalPagesBuy = Math.ceil(totalCountBuy / PAGE_SIZE_BUY);
  //filter by name
  const filterCoin = (e) => {
    const value = e.target.value.toLowerCase();

    const filtered = ordersBuy.filter((item) =>
      item.name.toLowerCase().includes(value),
    );

    setFilteredCoin(filtered);
  };

  useEffect(() => {
    fetchOrdersBuy();
    getBuyDate();
    getTotalToadyCoin();
  }, [pagebuy]);

  //total coins today
  const getBuyDate = async () => {
    const createToady = new DateObject({
      calendar: persian,
      locale: persian_fa,
    });
    const getToday = createToady.format("YYYY/MM/DD");
    const { data, error } = await supabase
      .from("buy")
      .select("*")
      .eq("date", getToday);
    if (error) {
      console.log(error.message);
      return;
    }
    setAllBuyToday(data);
  };
  const totalToadyCoin = allBuyToday.map((item) => Number(item.quantity));
  const totalCoinsSoldToday = totalToadyCoin.reduce((sum, num) => sum + num, 0);

  //total coins all
  const getTotalToadyCoin = async () => {
    const { data, error } = await supabase.from("buy").select("*");
    if (error) {
      console.log(error.message);
      return;
    }
    setAllBuy(data);
  };
  const totalCoin = allBuy.map((item) => Number(item.quantity));
  const totalCoinsSold = totalCoin.reduce((sum, num) => sum + num, 0);
  //fetch today prices
  const fetchTodayPrices = async () => {
    const createToady = new DateObject({
      calendar: persian,
      locale: persian_fa,
    });
    const getToday = createToady.format("YYYY/MM/DD");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { data, error } = await supabase
      .from("buy")
      .select("*")
      .eq("date", getToday);
    if (error) {
      console.error(error);
      return;
    }
    // Convert text to number and sum
    const before = data;
    const total = data.reduce((acc, row) => {
      if (!row.total) return acc;
      // Remove all non-digit characters
      const numericPrice = Number(row.total.replace(/\D/g, ""));
      return acc + (isNaN(numericPrice) ? 0 : numericPrice);
    }, 0);

    setTotalPrice(total);
  };

  useEffect(() => {
    fetchTodayPrices();
  }, []);
  console.log(totalPrice);

  //sound
  const insertSound = new Audio("/sounds/ui.mp3");
  const playSound = (type) => {
    if (type === "UPDATE") insertSound.play();
  };
  //real-time
  useEffect(() => {
    const channel = supabase
      .channel("realtime-buy-table")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buy",
        },
        async (payload) => {
          console.log("Realtime change:", payload);
          playSound(payload.eventType);
          // Refresh current page
          fetchOrdersBuy();
          // Refresh totals

          getBuyDate();
          getTotalToadyCoin();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pagebuy]);

  return (
    <div>
      <div className="max-w-7xl mx-auto mt-10">
        <h2 className="text- font-bold text-gray-800 mb-8 text-center text-shadow-lg ">
          - لیست خرید -
        </h2>
        <div className="flex justify-start gap-25 flex-row items-center ">
          <div className="relative mb-8">
            <input
              type="text"
              placeholder="جست و جو ..."
              onChange={(e) => filterCoin(e)}
              className="
      w-72
      pr-10 pl-4 py-2
      rounded-2xl
      border-2 border-amber-400
      bg-white
      shadow-sm
      text-gray-700
      placeholder-gray-400
      focus:outline-none
      focus:ring-2 focus:ring-amber-500
      focus:border-amber-500
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
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-yellow-500 p-3 rounded-2xl ">
            تعداد کل امروز: {totalCoinsSoldToday} سکه
          </h2>
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-yellow-500 p-3 rounded-2xl ">
            مبلغ کل امروز: {totalPrice.toLocaleString()}
          </h2>
          <h2 className="font-bold text-gray-600 mb-8 text-center bg-yellow-500 p-3 rounded-2xl ">
            تعداد کل : {totalCoinsSold} سکه
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
                <thead className="bg-gradient-to-r from-yellow-500 txt-xs to-orange-500 text-white">
                  <tr>
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
                      {editingIdBuy === order.id ? (
                        <>
                          <td className="px-6 py-4 text-center">
                            <input
                              name="name"
                              value={editFormDataBuy.name}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="quantity"
                              value={editFormDataBuy.quantity}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="price"
                              value={editFormDataBuy.price}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
                                  setCalendarVisibleBuy,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              value={editFormDataBuy.total}
                              readOnly
                              className="w-full bg-gray-100 border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div
                              onClick={() =>
                                setCalendarVisibleBuy(!calendarVisibleBuy)
                              }
                              className="cursor-pointer"
                            >
                              {editFormDataBuy.date
                                ? editFormDataBuy.date
                                : order.date}
                            </div>

                            {calendarVisibleBuy && (
                              <Calendar
                                calendar={persian}
                                locale={persian_fa}
                                value={editFormDataBuy.date}
                                onChange={(e) =>
                                  handleDateChange(
                                    e,
                                    setEditFormDataBuy,
                                    editFormDataBuy,
                                    setCalendarVisibleBuy,
                                  )
                                }
                              />
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="delivery"
                              value={editFormDataBuy.delivery}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="description"
                              value={editFormDataBuy.description}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
                                )
                              }
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <select
                              name="status"
                              value={editFormDataBuy.status}
                              onChange={(e) =>
                                handleEditChange(
                                  e,
                                  setEditFormDataBuy,
                                  editFormDataBuy,
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
                                  setEditingIdBuy,
                                  editFormDataBuy,
                                  setFilteredCoin,
                                  filteredCoin,
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
                                  setEditingIdBuy,
                                  setCalendarVisibleBuy,
                                  setEditFormDataBuy,
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
                            {order.status || "-"}
                          </td>

                          <td className="px-6 py-4 text-center max-sm:p-3">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() =>
                                  handleEdit(
                                    order,
                                    setEditingIdBuy,
                                    setEditFormDataBuy,
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
                                    fetchTodayPrices,
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
            disabled={pagebuy === 1}
            onClick={() => setPagebuy((prev) => prev - 1)}
          >
            {!page === 1 && <GrLinkNext />}
          </button>

          <span>
            {totalPagesBuy === 0 ? page : `${pagebuy} از ${totalPagesBuy}`}
          </span>
          <button
            disabled={pagebuy === totalPagesBuy}
            onClick={() => setPagebuy((prev) => prev + 1)}
          >
            {totalPagesBuy !== pagebuy && <GrLinkPrevious />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Buy;
