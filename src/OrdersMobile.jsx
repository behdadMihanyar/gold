// export default OrdersMobile;
import React, { useEffect, useState } from "react";
import { useDataContext } from "./Context/DataContext.jsx";
import supabase from "./supabase";
import {
  handleCancel as handleCancelBuy,
  handleDelete as handleDeleteBuy,
  handleEdit as handleEditBuy,
  handleEditChange as handleEditChangeBuy,
  handleUpdate as handleUpdateBuy,
  handleDateChange as handleDateChangeBuy,
  fetchTodayPrices as fetchTodayPricesBuy,
  getSalesDate as getSalesDateBuy,
} from "./utils/buyUpdate.js";

import {
  handleCancel as handleCancelSell,
  handleDelete as handleDeleteSell,
  handleEdit as handleEditSell,
  handleEditChange as handleEditChangeSell,
  handleUpdate as handleUpdateSell,
  handleDateChange as handleDateChangeSell,
  fetchTodayPrices as fetchTodayPricesSell,
  getSalesDate as getSalesDate,
} from "./utils/sellUpdate.js";
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

const OrdersMobile = () => {
  //buy
  const [totalPriceBuy, setTotalPriceBuy] = useState(0); // total price today
  const [allBuyToday, setAllBuyToday] = useState([]); // total coin today
  const [ordersBuy, setOrdersBuy] = useState([]);
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
  //sell
  const [totalPriceSell, setTotalPriceSell] = useState(0); // total price today
  const [allSellToday, setAllSellToday] = useState([]); // total coin today
  const [ordersSell, setOrdersSell] = useState([]);
  const [editingIdSell, setEditingIdSell] = useState(null);
  const [calendarVisibleSell, setCalendarVisibleSell] = useState(false);
  const [editFormDataSell, setEditFormDataSell] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
    status: "",
  });
  const {
    pagebuy,
    setPagebuy,
    totalCountBuy,
    setTotalCountBuy,
    setTotalCountSell,
    totalCountSell,
    pageSell,
    setPageSell,
  } = useDataContext();
  const PAGE_SIZE_BUY = 5;
  const PAGE_SIZE_SELL = 5;

  const [toggle, setToggle] = useState("sell");

  // ================= FETCH BUY =================
  const fetchOrdersBuy = async () => {
    const from = (pagebuy - 1) * PAGE_SIZE_BUY;
    const to = from + PAGE_SIZE_BUY - 1;

    const { data, count, error } = await supabase
      .from("buy")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrdersBuy(data || []);
      setTotalCountBuy(count);
    }
  };
  // ================= FETCH Sell =================
  const fetchOrdersSell = async () => {
    const from = (pageSell - 1) * PAGE_SIZE_SELL;
    const to = from + PAGE_SIZE_SELL - 1;

    const { data, count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrdersSell(data || []);
      setTotalCountSell(count);
    }
  };

  const totalPagesBuy = Math.ceil(totalCountBuy / PAGE_SIZE_BUY);
  const totalPagesSell = Math.ceil(totalCountSell / PAGE_SIZE_SELL);

  // total today coin sell
  const totalToadyCoin = allSellToday.map((item) => Number(item.quantity));
  const totalCoinsSoldToday = totalToadyCoin.reduce((sum, num) => sum + num, 0);
  console.log(totalCoinsSoldToday);

  //total today coin buy
  const totalToadyCoinBuy = allBuyToday.map((item) => Number(item.quantity));
  const totalCoinsBoughtToday = totalToadyCoinBuy.reduce(
    (sum, num) => sum + num,
    0
  );

  useEffect(() => {
    fetchTodayPricesSell(setTotalPriceSell);
    getSalesDate(setAllSellToday);
    fetchTodayPricesBuy(setTotalPriceBuy);
    getSalesDateBuy(setAllBuyToday);
  }, []);
  useEffect(() => {
    fetchOrdersBuy();
  }, [pagebuy]);
  useEffect(() => {
    fetchOrdersSell();
  }, [pageSell]);
  // ================= RENDER =================
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <div className="flex justify-center gap-3">
        <button
          className="bg-blue-400 p-3 rounded-2xl"
          onClick={() => setToggle("sell")}
        >
          فروش
        </button>
        <button
          className="bg-blue-400 p-3 rounded-2xl"
          onClick={() => setToggle("buy")}
        >
          خرید
        </button>
      </div>
      {toggle === "buy" ? (
        <div>
          {/* ================= HEADER ================= */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="text-lg md:text-xl font-bold text-gray-800">
              لیست خرید
            </div>
            <div className="w-full md:w-auto text-center font-bold bg-yellow-400 px-4 py-2 rounded-xl">
              تعداد کل : {totalCoinsBoughtToday} سکه
            </div>

            <div className="w-full md:w-auto text-center font-bold bg-yellow-400 px-4 py-2 rounded-xl">
              مبلغ کل : {totalPriceBuy.toLocaleString()}
            </div>
          </div>

          {/* ================= MOBILE VIEW ================= */}
          <div className="md:hidden space-y-4">
            {ordersBuy.map((order) => (
              <div
                key={order.id}
                className="bg-white shadow-md rounded-xl p-4 space-y-3"
              >
                {editingIdBuy === order.id ? (
                  <>
                    <input
                      name="name"
                      value={editFormDataBuy.name}
                      onChange={(e) =>
                        handleEditChangeBuy(
                          e,
                          setEditFormDataBuy,
                          editFormDataBuy
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="نام"
                    />

                    <input
                      name="quantity"
                      value={editFormDataBuy.quantity}
                      onChange={(e) =>
                        handleEditChangeBuy(
                          e,
                          setEditFormDataBuy,
                          editFormDataBuy
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="تعداد"
                    />

                    <input
                      name="price"
                      value={editFormDataBuy.price}
                      onChange={(e) =>
                        handleEditChangeBuy(
                          e,
                          setEditFormDataBuy,
                          editFormDataBuy
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="نرخ"
                    />

                    <div
                      onClick={() => setCalendarVisibleBuy(!calendarVisibleBuy)}
                      className="border rounded px-2 py-1 text-sm cursor-pointer text-center"
                    >
                      {editFormDataBuy.date || "انتخاب تاریخ"}
                    </div>

                    {calendarVisibleBuy && (
                      <Calendar
                        calendar={persian}
                        locale={persian_fa}
                        value={editFormDataBuy.date}
                        onChange={(e) =>
                          handleDateChangeBuy(
                            e,
                            setEditFormDataBuy,
                            editFormDataBuy,
                            setCalendarVisibleBuy
                          )
                        }
                      />
                    )}

                    <select
                      name="status"
                      value={editFormDataBuy.status}
                      onChange={(e) =>
                        handleEditChangeBuy(
                          e,
                          setEditFormDataBuy,
                          editFormDataBuy
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="تسویه نشده">تسویه نشده</option>
                      <option value="پرداخت شده">پرداخت شده</option>
                      <option value="تحویل شده">تحویل شده</option>
                    </select>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() =>
                          handleUpdateBuy(
                            order.id,
                            setEditingIdBuy,
                            editFormDataBuy,
                            setOrdersBuy,
                            ordersBuy
                          )
                        }
                        className="flex-1 bg-green-500 text-white py-1 rounded-lg text-sm"
                      >
                        ذخیره
                      </button>

                      <button
                        onClick={() =>
                          handleCancelBuy(
                            setEditingIdBuy,
                            setCalendarVisibleBuy,
                            setEditFormDataBuy
                          )
                        }
                        className="flex-1 bg-gray-400 text-white py-1 rounded-lg text-sm"
                      >
                        انصراف
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="font-semibold">نام:</span>
                      <span>{order.name}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">تعداد:</span>
                      <span>{order.quantity}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">جمع:</span>
                      <span>{order.total}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">تاریخ:</span>
                      <span>{order.date}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">وضعیت:</span>
                      <span>{order.status || "-"}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() =>
                          handleEditBuy(
                            order,
                            setEditingIdBuy,
                            setEditFormDataBuy
                          )
                        }
                        className="flex-1 bg-blue-500 text-white py-1 rounded-lg text-sm"
                      >
                        ویرایش
                      </button>

                      <button
                        onClick={async () => {
                          const deleted = await handleDeleteBuy(
                            order.id,
                            ordersBuy,
                            setOrdersBuy
                          );

                          if (deleted) {
                            fetchTodayPricesBuy(setTotalPriceBuy);
                            getSalesDateBuy(setAllBuyToday);
                          }
                        }}
                        className="flex-1 bg-red-500 text-white py-1 rounded-lg text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ================= PAGINATION ================= */}
          <div className="flex justify-center mt-6 gap-3">
            <button
              disabled={pagebuy === 1}
              onClick={() => setPagebuy((prev) => prev - 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              قبلی
            </button>

            <span className="font-medium">
              {pagebuy} از {totalPagesBuy}
            </span>

            <button
              disabled={pagebuy === totalPagesBuy}
              onClick={() => setPagebuy((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              بعدی
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* ================= HEADER ================= */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="text-lg md:text-xl font-bold text-gray-800">
              لیست فروش
            </div>
            <div className="w-full md:w-auto text-center font-bold bg-yellow-400 px-4 py-2 rounded-xl">
              تعداد کل : {totalCoinsSoldToday} سکه
            </div>

            <div className="w-full md:w-auto text-center font-bold bg-yellow-400 px-4 py-2 rounded-xl">
              مبلغ کل : {totalPriceSell.toLocaleString()}
            </div>
          </div>

          {/* ================= MOBILE VIEW ================= */}
          <div className="md:hidden space-y-4">
            {ordersSell.map((order) => (
              <div
                key={order.id}
                className="bg-white shadow-md rounded-xl p-4 space-y-3"
              >
                {editingIdSell === order.id ? (
                  <>
                    <input
                      name="name"
                      value={editFormDataSell.name}
                      onChange={(e) =>
                        handleEditChangeSell(
                          e,
                          setEditFormDataSell,
                          editFormDataSell
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="نام"
                    />

                    <input
                      name="quantity"
                      value={editFormDataSell.quantity}
                      onChange={(e) =>
                        handleEditChangeSell(
                          e,
                          setEditFormDataSell,
                          editFormDataSell
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="تعداد"
                    />

                    <input
                      name="price"
                      value={editFormDataSell.price}
                      onChange={(e) =>
                        handleEditChangeSell(
                          e,
                          setEditFormDataSell,
                          editFormDataSell
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="نرخ"
                    />

                    <div
                      onClick={() =>
                        setCalendarVisibleSell(!calendarVisibleSell)
                      }
                      className="border rounded px-2 py-1 text-sm cursor-pointer text-center"
                    >
                      {editFormDataSell.date || "انتخاب تاریخ"}
                    </div>

                    {calendarVisibleSell && (
                      <Calendar
                        calendar={persian}
                        locale={persian_fa}
                        value={editFormDataSell.date}
                        onChange={(e) =>
                          handleDateChangeSell(
                            e,
                            setEditFormDataSell,
                            editFormDataSell,
                            setCalendarVisibleSell
                          )
                        }
                      />
                    )}

                    <select
                      name="status"
                      value={editFormDataSell.status}
                      onChange={(e) =>
                        handleEditChangeSell(
                          e,
                          setEditFormDataSell,
                          editFormDataSell
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="تسویه نشده">تسویه نشده</option>
                      <option value="پرداخت شده">پرداخت شده</option>
                      <option value="تحویل شده">تحویل شده</option>
                    </select>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() =>
                          handleUpdateSell(
                            order.id,
                            setEditingIdSell,
                            editFormDataSell,
                            setOrdersSell,
                            ordersSell
                          )
                        }
                        className="flex-1 bg-green-500 text-white py-1 rounded-lg text-sm"
                      >
                        ذخیره
                      </button>

                      <button
                        onClick={() =>
                          handleCancelSell(
                            setEditingIdSell,
                            setCalendarVisibleSell,
                            setEditFormDataSell
                          )
                        }
                        className="flex-1 bg-gray-400 text-white py-1 rounded-lg text-sm"
                      >
                        انصراف
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="font-semibold">نام:</span>
                      <span>{order.name}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">تعداد:</span>
                      <span>{order.quantity}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">جمع:</span>
                      <span>{order.total}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">تاریخ:</span>
                      <span>{order.date}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-semibold">وضعیت:</span>
                      <span>{order.status || "-"}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() =>
                          handleEditSell(
                            order,
                            setEditingIdSell,
                            setEditFormDataSell
                          )
                        }
                        className="flex-1 bg-blue-500 text-white py-1 rounded-lg text-sm"
                      >
                        ویرایش
                      </button>

                      <button
                        onClick={async () => {
                          const deleted = await handleDeleteSell(
                            order.id,
                            ordersSell,
                            setOrdersSell
                          );

                          if (deleted) {
                            fetchTodayPricesSell(setTotalPriceSell);
                            getSalesDate(setAllSellToday);
                          }
                        }}
                        className="flex-1 bg-red-500 text-white py-1 rounded-lg text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ================= PAGINATION ================= */}
          <div className="flex justify-center mt-6 gap-3">
            <button
              disabled={pageSell === 1}
              onClick={() => setPageSell((prev) => prev - 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              قبلی
            </button>

            <span className="font-medium">
              {pageSell} از {totalPagesSell}
            </span>

            <button
              disabled={pageSell === totalPagesSell}
              onClick={() => setPageSell((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersMobile;
