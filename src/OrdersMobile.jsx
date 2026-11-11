import React, { useCallback, useEffect, useState } from "react";
import { useDataContext } from "./Context/DataContext.jsx";
import { ordersApi } from "./api/orders";
import { useOrdersRealtime } from "./api/realtime";
import {
  buyHandlers,
  handleCancel,
  handleDateChange,
  handleEdit,
  handleEditChange,
  sellHandlers,
} from "./utils/orderHandlers.js";
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";

// Shared form helpers, aliased per side for readability in the markup below.
const handleCancelBuy = handleCancel;
const handleCancelSell = handleCancel;
const handleEditBuy = handleEdit;
const handleEditSell = handleEdit;
const handleEditChangeBuy = handleEditChange;
const handleEditChangeSell = handleEditChange;
const handleDateChangeBuy = handleDateChange;
const handleDateChangeSell = handleDateChange;
const { handleUpdate: handleUpdateBuy, handleDelete: handleDeleteBuy } =
  buyHandlers;
const { handleUpdate: handleUpdateSell, handleDelete: handleDeleteSell } =
  sellHandlers;

const PAGE_SIZE_BUY = 5;
const PAGE_SIZE_SELL = 5;
const emptyEditForm = {
  name: "",
  quantity: "",
  price: "",
  description: "",
  date: "",
  total: "",
  delivery: "",
  status: "",
};

const OrdersMobile = () => {
  //buy
  const [buyToday, setBuyToday] = useState({ quantity: 0, amount: 0 });
  const [ordersBuy, setOrdersBuy] = useState([]);
  const [editingIdBuy, setEditingIdBuy] = useState(null);
  const [calendarVisibleBuy, setCalendarVisibleBuy] = useState(false);
  const [editFormDataBuy, setEditFormDataBuy] = useState(emptyEditForm);
  //sell
  const [sellToday, setSellToday] = useState({ quantity: 0, amount: 0 });
  const [ordersSell, setOrdersSell] = useState([]);
  const [editingIdSell, setEditingIdSell] = useState(null);
  const [calendarVisibleSell, setCalendarVisibleSell] = useState(false);
  const [editFormDataSell, setEditFormDataSell] = useState(emptyEditForm);
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

  const [toggle, setToggle] = useState("sell");

  // ================= FETCH =================
  const fetchOrdersBuy = useCallback(async () => {
    try {
      const res = await ordersApi.list("buy", {
        page: pagebuy,
        pageSize: PAGE_SIZE_BUY,
      });
      setOrdersBuy(res.data);
      setTotalCountBuy(res.total);
    } catch (err) {
      console.error(err);
    }
  }, [pagebuy, setTotalCountBuy]);

  const fetchOrdersSell = useCallback(async () => {
    try {
      const res = await ordersApi.list("sell", {
        page: pageSell,
        pageSize: PAGE_SIZE_SELL,
      });
      setOrdersSell(res.data);
      setTotalCountSell(res.total);
    } catch (err) {
      console.error(err);
    }
  }, [pageSell, setTotalCountSell]);

  const refreshBuyToday = () => buyHandlers.loadTodaySummary(setBuyToday);
  const refreshSellToday = () => sellHandlers.loadTodaySummary(setSellToday);

  useEffect(() => {
    refreshBuyToday();
    refreshSellToday();
  }, []);
  useEffect(() => {
    fetchOrdersBuy();
  }, [fetchOrdersBuy]);
  useEffect(() => {
    fetchOrdersSell();
  }, [fetchOrdersSell]);

  useOrdersRealtime((event) => {
    if (event.side === "buy") {
      fetchOrdersBuy();
      refreshBuyToday();
    } else {
      fetchOrdersSell();
      refreshSellToday();
    }
  });

  const totalPagesBuy = Math.ceil(totalCountBuy / PAGE_SIZE_BUY);
  const totalPagesSell = Math.ceil(totalCountSell / PAGE_SIZE_SELL);
  const totalCoinsSoldToday = sellToday.quantity;
  const totalCoinsBoughtToday = buyToday.quantity;
  const totalPriceSell = sellToday.amount;
  const totalPriceBuy = buyToday.amount;

  // ================= RENDER =================
  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <h2 className="text-center font-bold">پنل مدیریت خرید و فروش</h2>
      <h3 className="text-center font-bold">سکه قصر</h3>
      <div className="flex justify-center gap-4 mt-10">
        <button
          className="bg-blue-400 text-white font-semibold py-3 px-8 rounded-2xl shadow-md transition duration-300 transform hover:bg-blue-500 hover:scale-105"
          onClick={() => setToggle("sell")}
        >
          فروش
        </button>
        <button
          className="bg-green-400 text-white font-semibold py-3 px-8 rounded-2xl shadow-md transition duration-300 transform hover:bg-green-500 hover:scale-105"
          onClick={() => setToggle("buy")}
        >
          خرید
        </button>
      </div>
      {toggle === "buy" ? (
        <div>
          {/* ================= HEADER ================= */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 mt-8">
            <div className="text-lg md:text-xl font-bold text-gray-800">
              - لیست خرید -
            </div>
            <div className="w-full md:w-auto text-center font-bold bg-emerald-300 px-4 py-2 rounded-xl">
              تعداد کل امروز : {totalCoinsBoughtToday} سکه
            </div>

            <div className="w-full md:w-auto text-center font-bold bg-emerald-300 px-4 py-2 rounded-xl">
              مبلغ کل امروز : {totalPriceBuy.toLocaleString()} ریال
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

                          if (deleted) refreshBuyToday();
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
              <GrLinkNext />
            </button>

            <span className="font-medium">
              {pagebuy} از {totalPagesBuy}
            </span>

            <button
              disabled={pagebuy === totalPagesBuy}
              onClick={() => setPagebuy((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              <GrLinkPrevious />
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* ================= HEADER ================= */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 mt-8">
            <div className="text-lg md:text-xl font-bold text-gray-800">
              - لیست فروش -
            </div>
            <div className="w-full md:w-auto text-center font-bold bg-emerald-300 text-gray-800 px-4 py-2 rounded-xl">
              تعداد کل امروز : {totalCoinsSoldToday} سکه
            </div>

            <div className="w-full md:w-auto text-center font-bold bg-emerald-300 text-gray-800 px-4 py-2 rounded-xl">
              مبلغ کل امروز : {totalPriceSell.toLocaleString()} ریال
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

                          if (deleted) refreshSellToday();
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
              <GrLinkNext />
            </button>

            <span className="font-medium">
              {pageSell} از {totalPagesSell}
            </span>

            <button
              disabled={pageSell === totalPagesSell}
              onClick={() => setPageSell((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              <GrLinkPrevious />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersMobile;
