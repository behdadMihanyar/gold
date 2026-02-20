import { toast } from "react-toastify";
import supabase from "../supabase";
import persian from "react-date-object/calendars/persian";
import { Calendar } from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian_fa from "react-date-object/locales/persian_fa";

export const fetchTodayPrices = async (setTotalPrice) => {
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
    .from("tasks")
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
//total coins today
export const getSalesDate = async (setAllSellToday) => {
  const createToady = new DateObject({
    calendar: persian,
    locale: persian_fa,
  });
  const getToday = createToady.format("YYYY/MM/DD");
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("date", getToday);
  if (error) {
    console.log(error.message);
    return;
  }
  setAllSellToday(data);
};
//Edit State Change
export const handleEdit = (order, setEditingId, setEditFormData) => {
  setEditingId(order.id);
  setEditFormData({
    name: order.name,
    quantity: order.quantity,
    price: order.price,
    description: order.description || "",
    date: order.date,
    total: order.total,
    delivery: order.delivery || "",
    status: order.status || "تسویه نشده",
  });
};

//Edit
export const handleEditChange = (e, setEditFormData, editFormData) => {
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

//Delete
export const handleDateChange = (
  date,
  setEditFormData,
  editFormData,
  setCalendarVisible
) => {
  setEditFormData({
    ...editFormData,
    date: date.format("YYYY/MM/DD", { Calendar: persian }),
  });
  setCalendarVisible(false);
};

//Update
export const handleUpdate = async (
  id,
  setEditingId,
  editFormData,
  setOrders,
  orders
) => {
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

//Cancel
export const handleCancel = (
  setEditingId,
  setCalendarVisible,
  setEditFormData
) => {
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

//Delete
export const handleDelete = async (
  id,
  orders,
  setOrders,
  getTotalToadyCoin
) => {
  if (window.confirm("Are you sure you want to delete this order?")) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      alert("Error deleting order: " + error.message);
    } else {
      getTotalToadyCoin();
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
