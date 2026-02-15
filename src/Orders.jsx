import React, { useState, useEffect } from "react";
import supabase from "./supabase";
import { Calendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ToastContainer, toast } from "react-toastify";
import gold from "./img/gold.png";
import { useDataContext } from "./Context/DataContext";
import OrdersMobile from "./OrdersMobile";
import { GrLinkNext, GrLinkPrevious } from "react-icons/gr";
const OrderList = () => {
<<<<<<< HEAD
=======

  //States for sell
>>>>>>> 598674f (Buy_Feature)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    quantity: "",
    price: "",
    description: "",
    date: "",
    total: "",
    delivery: "",
    status: "",
  });
<<<<<<< HEAD
  const { isMobile, setIsMobile, totalCount, setTotalCount, page, setPage } =
    useDataContext();

  // const fetchOrders = async () => {
  //   try {
  //     setLoading(true);
  //     const { data, error } = await supabase
  //       .from("tasks")
  //       .select("*")
  //       .order("date", { ascending: false });

  //     if (error) throw error;

  //     setOrders(data || []);
  //   } catch (err) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const PAGE_SIZE = 10;
=======
  //States for buy
  const [ordersBuy, setOrdersBuy] = useState([]);
  const [loadingBuy, setLoadingBuy] = useState(true);
  const [errorBuy, setErrorBuy] = useState(null);
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

  //Context
  const { isMobile, setIsMobile,pagebuy,setPagebuy, totalCount, setTotalCount, page, setPage,totalCountBuy,setTotalCountBuy } =useDataContext();

  //Sell tables from SupaBase
  const PAGE_SIZE = 5;
>>>>>>> 598674f (Buy_Feature)
  const fetchOrders = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact" })
<<<<<<< HEAD
      .range(from, to);
=======
      .range(from, to)
      .order("created_at", { ascending: false });
>>>>>>> 598674f (Buy_Feature)

    if (error) {
      throw error;
    } else {
      setOrders(data || []);
      setTotalCount(count);
      setLoading(false);
    }
  };
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

<<<<<<< HEAD
  useEffect(() => {
    fetchOrders();
  }, [page]);

=======
    //Buy tables from supabase
    const PAGE_SIZE_BUY = 5;
    const fetchOrdersBuy = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };
    const totalPagesBuy = Math.ceil(totalCountBuy / PAGE_SIZE_BUY);

  useEffect(() => {
    fetchOrders();
    fetchOrdersBuy();
  }, [page,pagebuy]);

  //Edit State Change
>>>>>>> 598674f (Buy_Feature)
  const handleEdit = (order) => {
    setEditingId(order.id);
    setEditFormData({
      name: order.name,
      quantity: order.quantity,
      price: order.price,
      description: order.description || "",
      date: order.date,
      total: order.total,
      delivery: order.delivery || "",
<<<<<<< HEAD
      status: order.status || "در انتظار",
    });
  };

=======
      status: order.status || "تسویه نشده",
    });
  };

  //Edit
>>>>>>> 598674f (Buy_Feature)
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name === "price") {
      const numericValue = value.replace(/\D/g, "");
      const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

      const quantity = editFormData.quantity;
      const price = numericValue;

      setEditFormData({
        ...editFormData,
        price: formattedPrice,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else if (name === "quantity") {
      const numericValue = value.replace(/\D/g, "");
      const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

      const quantity = value;
      const price = editFormData.price.replace(/\D/g, "");

      setEditFormData({
        ...editFormData,
        quantity: formattedPrice,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

<<<<<<< HEAD
=======
  //Delete
>>>>>>> 598674f (Buy_Feature)
  const handleDateChange = (date) => {
    console.log(date);
    setEditFormData({
      ...editFormData,
      date: date.format("YYYY/MM/DD", { calendar: persian }),
    });
    setCalendarVisible(false);
  };

<<<<<<< HEAD
=======
  //Update
>>>>>>> 598674f (Buy_Feature)
  const handleUpdate = async (id) => {
    if (!editFormData.quantity) {
      alert("لطفا مقادیر مورد نظر را وارد کنید");
      return;
    }
    const updatedData = {
      ...editFormData,
      date: editFormData.date,
    };

    const { error } = await supabase
      .from("tasks")
      .update(updatedData)
      .eq("id", id);

    if (error) {
      alert("Error updating order: " + error.message);
    } else {
      setOrders(
        orders.map((order) =>
<<<<<<< HEAD
          order.id === id ? { ...order, ...updatedData } : order
        )
=======
          order.id === id ? { ...order, ...updatedData } : order,
        ),
>>>>>>> 598674f (Buy_Feature)
      );

      setEditingId(null);
      toast.success("سفارشات با موفقیت بروزرسانی شد", {
        position: "top-left",
        style: {
          fontSize: "18px",
        },
      });
    }
  };

<<<<<<< HEAD
=======
  //Cancel
>>>>>>> 598674f (Buy_Feature)
  const handleCancel = () => {
    setEditingId(null);
    setCalendarVisible(false);

    setEditFormData({
      name: "",
      quantity: "",
      price: "",
      description: "",
      date: "",
      total: "",
      delivery: "",
      status: "",
    });
  };

<<<<<<< HEAD
=======
  //Delete
>>>>>>> 598674f (Buy_Feature)
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        alert("Error deleting order: " + error.message);
      } else {
        setOrders(orders.filter((order) => order.id !== id));
        toast.success("سفارش با موفقیت حذف شد", {
          position: "top-left",
          style: {
            fontSize: "18px",
          },
        });
      }
    }
  };

<<<<<<< HEAD
=======
  //Loading ...
>>>>>>> 598674f (Buy_Feature)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-white">بارگذاری ...</div>
      </div>
    );
  }
<<<<<<< HEAD

=======
  //Loading Error
>>>>>>> 598674f (Buy_Feature)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-red-600">Error: {error}</div>
      </div>
    );
  }
<<<<<<< HEAD

=======
  //Mobile View
>>>>>>> 598674f (Buy_Feature)
  if (isMobile) {
    return <OrdersMobile />;
  }

  return (
    <div className="min-h-screen p-4 max-sm:p-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center flex-col items-center ">
<<<<<<< HEAD
          <img src={gold} alt="gold" width={125} height={125} />
          <h2 className="text- font-bold text-gray-800 mb-8 text-center text-shadow-lg ">
            - لیست سفارشات -
=======
          {/* <img src={gold} alt="gold" width={125} height={125} /> */}
          <h2 className="text- font-bold text-gray-800 mb-8 text-center text-shadow-lg ">
            - لیست فروش -
>>>>>>> 598674f (Buy_Feature)
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white shadow-xl rounded-2xl p-12 text-center">
            <p className="text-xl text-gray-500">No orders found</p>
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
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50 transition`}
                    >
                      {editingId === order.id ? (
                        <>
                          <td className="px-6 py-4 text-center">
                            <input
                              name="name"
                              value={editFormData.name}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="quantity"
                              value={editFormData.quantity}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="price"
                              value={editFormData.price}
                              onChange={handleEditChange}
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
                                onChange={handleDateChange}
                              />
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="delivery"
                              value={editFormData.delivery}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="description"
                              value={editFormData.description}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <select
                              name="status"
                              value={editFormData.status}
                              onChange={handleEditChange}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="تسویه نشده">تسویه نشده</option>
                              <option value="پرداخت شده">پرداخت شده</option>
                              <option value="تحویل شده">تحویل شده</option>
                            </select>
                          </td>

                          <td className="px-6 py-4 text-center flex justify-center">
                            <button
                              onClick={() => handleUpdate(order.id)}
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
                              onClick={() => handleCancel(order.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                            >
                              X بستن
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
                                onClick={() => handleEdit(order)}
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
                                onClick={() => handleDelete(order.id)}
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
          >
            <GrLinkNext />
          </button>

          <span>
            {" "}
            {page} از {totalPages}{" "}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            <GrLinkPrevious />
          </button>
        </div>
      </div>
<<<<<<< HEAD
=======



      {/*خرید*/}
      <div className="max-w-7xl mx-auto mt-10">
        <div className="flex justify-center flex-col items-center ">
          {/* <img src={gold} alt="gold" width={125} height={125} /> */}
          <h2 className="text- font-bold text-gray-800 mb-8 text-center text-shadow-lg ">
            - لیست خرید -
          </h2>
        </div>

        {ordersBuy.length === 0 ? (
          <div className="bg-white shadow-xl rounded-2xl p-12 text-center">
            <p className="text-xl text-gray-500">No orders found</p>
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
                  {ordersBuy.map((order, index) => (
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
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="quantity"
                              value={editFormDataBuy.quantity}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="price"
                              value={editFormDataBuy.price}
                              onChange={handleEditChange}
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

                            {calendarVisible && (
                              <Calendar
                                calendar={persian}
                                locale={persian_fa}
                                value={editFormData.date}
                                onChange={handleDateChange}
                              />
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="delivery"
                              value={editFormDataBuy.delivery}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              name="description"
                              value={editFormDataBuy.description}
                              onChange={handleEditChange}
                              className="w-full border rounded px-2 py-1 text-sm text-center"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <select
                              name="status"
                              value={editFormDataBuy.status}
                              onChange={handleEditChange}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="تسویه نشده">تسویه نشده</option>
                              <option value="پرداخت شده">پرداخت شده</option>
                              <option value="تحویل شده">تحویل شده</option>
                            </select>
                          </td>

                          <td className="px-6 py-4 text-center flex justify-center">
                            <button
                              onClick={() => handleUpdate(order.id)}
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
                              onClick={() => handleCancel(order.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200"
                            >
                              X بستن
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
                                onClick={() => handleEdit(order)}
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
                                onClick={() => handleDelete(order.id)}
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
            <GrLinkNext />
          </button>

          <span>
            {" "}
            {pagebuy} از {totalPagesBuy}{" "}
          </span>

          <button
            disabled={pagebuy === totalPagesBuy}
            onClick={() => setPagebuy((prev) => prev + 1)}
          >
            <GrLinkPrevious />
          </button>
        </div>
      </div>
>>>>>>> 598674f (Buy_Feature)
      <ToastContainer />
    </div>
  );
};

export default OrderList;
