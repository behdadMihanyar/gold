import React, { useEffect, useState } from "react";
import { useDataContext } from "./Context/DataContext";
import supabase from "./supabase";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Calendar } from "react-multi-date-picker";
import { toast } from "react-toastify";
const OrdersMobile = () => {
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
  const { isMobile, setIsMobile } = useDataContext();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      status: order.status || "در انتظار",
    });
  };

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
      const quantity = value;
      const price = editFormData.price.replace(/\D/g, "");

      setEditFormData({
        ...editFormData,
        quantity: value,
        total: quantity && price ? (quantity * price).toLocaleString() : "",
      });
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  const handleDateChange = (date) => {
    console.log(date);
    setEditFormData({
      ...editFormData,
      date: date.format("YYYY/MM/DD", { calendar: persian }),
    });
    setCalendarVisible(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("آیا از حذف این سفارش اطمینان دارید؟")) {
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
  const handleUpdate = async (id) => {
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
          order.id === id ? { ...order, ...updatedData } : order
        )
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
  return (
    <div className="mt-15">
      <h2 className="text-center mb-2">سفارشات</h2>
      <div className="sm:hidden space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl shadow-md p-4 space-y-2"
          >
            {editingId === order.id ? (
              <>
                <input
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />

                <input
                  name="quantity"
                  value={editFormData.quantity}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />

                <input
                  name="price"
                  value={editFormData.price}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />

                <input
                  value={editFormData.total}
                  readOnly
                  className="w-full bg-gray-100 border rounded-xl px-3 py-2 text-sm"
                />

                <div
                  onClick={() => setCalendarVisible(!calendarVisible)}
                  className="border rounded-xl px-3 py-2 text-sm cursor-pointer bg-gray-50"
                >
                  {editFormData.date || order.date}
                </div>

                {calendarVisible && (
                  <Calendar
                    calendar={persian}
                    locale={persian_fa}
                    value={editFormData.date}
                    onChange={handleDateChange}
                  />
                )}

                <input
                  name="delivery"
                  value={editFormData.delivery}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />

                <input
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />

                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                >
                  <option value="در انتظار">در انتظار</option>
                  <option value="در حال ارسال">در حال ارسال</option>
                  <option value="تحویل شده">تحویل شده</option>
                </select>

                <button
                  onClick={() => handleUpdate(order.id)}
                  className="w-full py-2 text-sm font-medium text-white bg-green-500 rounded-xl"
                >
                  ذخیره
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">نام</span>
                  <span className="font-semibold">{order.name}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">تعداد</span>
                  <span>{order.quantity}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">نرخ</span>
                  <span>{order.price}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">جمع کل</span>
                  <span className="text-blue-600 font-semibold">
                    {order.total}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">تاریخ</span>
                  <span>{order.date}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">وضعیت</span>
                  <span>{order.status || "-"}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleEdit(order)}
                    className="flex-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl"
                  >
                    ویرایش
                  </button>

                  <button
                    onClick={() => handleDelete(order.id)}
                    className="flex-1 py-2 text-sm text-red-600 bg-red-50 rounded-xl"
                  >
                    حذف
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersMobile;
