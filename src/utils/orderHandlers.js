// UI handlers for buy/sell orders. Form helpers are shared; anything that talks
// to the API is created per side by `createOrderHandlers(side)`.
// (Replaces the former buyRequest/sellRequest/buyUpdate/sellUpdate modules.)
import { toast } from "react-toastify";
import persian from "react-date-object/calendars/persian";
import { ordersApi } from "../api/orders";
import { formatPrice, parseAmount, todayJalali, toLatinDigits } from "./format";

const TOAST = { position: "top-left", style: { fontSize: "18px" } };
const DEFAULT_STATUS = "تسویه نشده";

export const emptyOrderForm = () => ({
  name: "",
  quantity: "",
  price: "",
  description: "",
  date: "",
  total: "",
  delivery: "",
});

const emptyEditForm = () => ({ ...emptyOrderForm(), status: "", accounting: false });

/** Apply one field change and keep the preview `total` in sync. */
function applyFieldChange(form, name, value) {
  if (name === "price" || name === "quantity") {
    const digits = toLatinDigits(value).replace(/\D/g, "");
    const next = {
      ...form,
      [name]: !digits ? "" : name === "price" ? formatPrice(digits) : digits,
    };
    const quantity = parseAmount(next.quantity);
    const price = parseAmount(next.price);
    next.total = quantity && price ? (quantity * price).toLocaleString() : "";
    return next;
  }
  return { ...form, [name]: value };
}

const formatPickedDate = (date) => date.format("YYYY/MM/DD", { calendar: persian });

// ---------------------------------------------------------------- create form
export const handleFormChange = (e, setForm) => {
  const { name, value } = e.target;
  setForm((prev) => applyFieldChange(prev, name, value));
};

export const handleFormDateChange = (date, setForm, setCalendarVisible) => {
  setForm((prev) => ({ ...prev, date: formatPickedDate(date) }));
  setCalendarVisible?.(false);
};

// ------------------------------------------------------------ inline editing
export const handleEdit = (order, setEditingId, setEditForm) => {
  setEditingId(order.id);
  setEditForm({
    name: order.name,
    quantity: String(order.quantity),
    price: order.price,
    description: order.description || "",
    date: order.date,
    total: order.total,
    delivery: order.delivery || "",
    status: order.status || DEFAULT_STATUS,
    accounting: order.accounting,
  });
};

export const handleEditChange = (e, setEditForm) => {
  const { name, value } = e.target;
  setEditForm((prev) => applyFieldChange(prev, name, value));
};

export const handleDateChange = (date, setEditForm, _editForm, setCalendarVisible) => {
  setEditForm((prev) => ({ ...prev, date: formatPickedDate(date) }));
  setCalendarVisible?.(false);
};

export const handleCancel = (setEditingId, setCalendarVisible, setEditForm) => {
  setEditingId(null);
  setCalendarVisible(false);
  setEditForm(emptyEditForm());
};

// ------------------------------------------------------------ API-backed ops
const FIELD_LABELS = {
  name: "نام",
  quantity: "تعداد",
  price: "نرخ",
  date: "تاریخ",
  status: "وضعیت",
  delivery: "تحویل دهنده",
  description: "توضیحات",
};

/** Turn an API error into a Persian message the user can act on. */
function errorMessage(err) {
  if (err?.status === 400 && err.details?.length) {
    const fields = [...new Set(err.details.map((d) => FIELD_LABELS[d.field] || d.field))];
    return `مقدار نامعتبر: ${fields.join("، ")}`;
  }
  if (err?.status === 401) return "نشست شما به پایان رسیده است. دوباره وارد شوید.";
  if (err?.status === 404) return "این سفارش پیدا نشد (احتمالا حذف شده است).";
  if (err?.status === 429) return "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.";
  if (err?.status >= 500) return "خطای سرور. دوباره تلاش کنید.";
  return "خطا در ارتباط با سرور";
}

const showError = (err) => toast.error(errorMessage(err), { position: "top-left" });

/** Client-side check before sending; returns a Persian message or null. */
function validateOrder(form) {
  if (!String(form.name ?? "").trim()) return "لطفا نام مشتری را وارد نمایید";
  if (!(parseAmount(form.quantity) > 0)) return "لطفا تعداد را وارد نمایید";
  if (!String(form.price ?? "").trim()) return "لطفا نرخ را وارد نمایید";
  if (!form.date) return "لطفا تاریخ را وارد نمایید";
  return null;
}

export function createOrderHandlers(side) {
  return {
    async handleSubmit(e, form, setForm) {
      e.preventDefault();
      const problem = validateOrder(form);
      if (problem) {
        toast.error(problem, { position: "top-left" });
        return;
      }
      try {
        await ordersApi.create(side, form);
        setForm(emptyOrderForm());
        toast.success("سفارش با موفقیت ثبت شد", TOAST);
      } catch (err) {
        showError(err);
      }
    },

    async handleUpdate(id, setEditingId, editForm, setRows, rows) {
      const problem = validateOrder(editForm);
      if (problem) {
        toast.error(problem, { position: "top-left" });
        return;
      }
      try {
        const updated = await ordersApi.update(side, id, editForm);
        setRows(rows.map((row) => (row.id === id ? updated : row)));
        setEditingId(null);
        toast.success("سفارشات با موفقیت بروزرسانی شد", TOAST);
      } catch (err) {
        showError(err);
      }
    },

    /** Resolves to true when the order was deleted. */
    async handleDelete(id, rows, setRows) {
      if (!window.confirm("آیا از حذف این سفارش مطمئن هستید؟")) return false;
      try {
        await ordersApi.remove(side, id);
        setRows(rows.filter((row) => row.id !== id));
        toast.success("سفارش با موفقیت حذف شد", TOAST);
        return true;
      } catch (err) {
        showError(err);
        return false;
      }
    },

    async setAccounting(id, accounting) {
      try {
        await ordersApi.update(side, id, { accounting });
      } catch (err) {
        showError(err);
      }
    },

    /** Today's totals → setSummary({ count, quantity, amount }). */
    async loadTodaySummary(setSummary) {
      try {
        setSummary(await ordersApi.summary(side, { date: todayJalali() }));
      } catch (err) {
        console.error(err);
      }
    },
  };
}

export const buyHandlers = createOrderHandlers("buy");
export const sellHandlers = createOrderHandlers("sell");
