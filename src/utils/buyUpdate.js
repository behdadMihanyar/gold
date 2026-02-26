import { toast } from "react-toastify";
import supabase from "../supabase";
import persian from "react-date-object/calendars/persian";
import { Calendar } from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian_fa from "react-date-object/locales/persian_fa";

//Edit State Change
export const handleEdit = (order, setEditingIdBuy, setEditFormDataBuy) => {
  setEditingIdBuy(order.id);
  setEditFormDataBuy({
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
//total today prices
export const fetchTodayPrices = async (setTotalPriceBuy) => {
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

  setTotalPriceBuy(total);
};
//total coin today
export const getSalesDate = async (setAllBuyToday) => {
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
  console.log(data);
  setAllBuyToday(data);
};
//Edit
export const handleEditChange = (e, setEditFormDataBuy, editFormDataBuy) => {
  const { name, value } = e.target;

  if (name === "price") {
    const numericValue = value.replace(/\D/g, "");
    const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

    const quantity = editFormDataBuy.quantity;
    const price = numericValue;

    setEditFormDataBuy({
      ...editFormDataBuy,
      price: formattedPrice,
      total: quantity && price ? (quantity * price).toLocaleString() : "",
    });
  } else if (name === "quantity") {
    const numericValue = value.replace(/\D/g, "");
    const formattedPrice = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, "/");

    const quantity = value;
    const price = editFormDataBuy.price.replace(/\D/g, "");

    setEditFormDataBuy({
      ...editFormDataBuy,
      quantity: formattedPrice,
      total: quantity && price ? (quantity * price).toLocaleString() : "",
    });
  } else {
    setEditFormDataBuy({ ...editFormDataBuy, [name]: value });
  }
};

//Delete
export const handleDateChange = (
  date,
  setEditFormDataBuy,
  editFormDataBuy,
  setCalendarVisibleBuy
) => {
  setEditFormDataBuy({
    ...editFormDataBuy,
    date: date.format("YYYY/MM/DD", { Calendar: persian }),
  });
  setCalendarVisibleBuy(false);
};

//Update
export const handleUpdate = async (
  id,
  setEditingIdBuy,
  editFormDataBuy,
  setFilteredCoin,
  filteredCoin
) => {
  if (!editFormDataBuy.quantity) {
    alert("لطفا مقادیر مورد نظر را وارد کنید");
    return;
  }
  const updatedData = {
    ...editFormDataBuy,
    date: editFormDataBuy.date,
  };

  const { error } = await supabase.from("buy").update(updatedData).eq("id", id);

  if (error) {
    alert("Error updating order: " + error.message);
  } else {
    setFilteredCoin(
      filteredCoin.map((order) =>
        order.id === id ? { ...order, ...updatedData } : order
      )
    );

    setEditingIdBuy(null);
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
  setEditingIdBuy,
  setCalendarVisibleBuy,
  setEditFormDataBuy
) => {
  setEditingIdBuy(null);
  setCalendarVisibleBuy(false);
  setEditFormDataBuy({
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
export const handleDelete = async (id, filteredCoin, setFilteredCoin) => {
  if (!window.confirm("Are you sure you want to delete this order?")) return;

  const { error } = await supabase.from("buy").delete().eq("id", id);

  if (error) {
    alert("Error deleting order: " + error.message);
    return false;
  }

  setFilteredCoin(filteredCoin.filter((order) => order.id !== id));

  toast.success("سفارش با موفقیت حذف شد", {
    position: "top-left",
    style: { fontSize: "18px" },
  });

  return true; // 👈 مهم
};
