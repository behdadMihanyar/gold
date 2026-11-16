import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** "1405/08/20" → "۱۴۰۵/۰۸/۲۰" */
export const toPersianDigits = (value) =>
  String(value ?? "").replace(/\d/g, (d) => PERSIAN_DIGITS[d]);

/** "۱۲/۵۰۰" → "12/500" */
export const toLatinDigits = (value) =>
  String(value ?? "").replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });

/** Extract the integer from user input such as "12/500/000" or "۱۲۵۰۰". */
export const parseAmount = (value) => {
  const digits = toLatinDigits(value).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

/** 12500000 → "12/500/000" (the separator style used across the dashboard). */
export const formatPrice = (value) =>
  String(parseAmount(value)).replace(/\B(?=(\d{3})+(?!\d))/g, "/");

export const formatAmount = (value) => Number(value || 0).toLocaleString();

/** Today's Jalali date as "YYYY/MM/DD" (Latin digits — what the API expects). */
export const todayJalali = () =>
  new DateObject({ calendar: persian }).format("YYYY/MM/DD");

/** Average unit price, safe for zero quantities. */
export const averagePrice = (amount, quantity) =>
  quantity > 0 ? Math.round(amount / quantity).toLocaleString() : "0";

const TEHRAN = { timeZone: "Asia/Tehran" };
const toDate = (v) => (v instanceof Date ? v : new Date(v));

/** ISO timestamp → "۱۴۰۵/۰۸/۲۵" (Jalali, Tehran time). */
export const jalaliDate = (v) =>
  v
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
        ...TEHRAN, year: "numeric", month: "2-digit", day: "2-digit",
      })
        .format(toDate(v))
        .replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660])
    : "";

/** ISO timestamp → "۱۴:۳۵" (Tehran time). */
export const clockTime = (v) =>
  v
    ? new Intl.DateTimeFormat("en-GB", { ...TEHRAN, hour: "2-digit", minute: "2-digit", hour12: false })
        .format(toDate(v))
        .replace(/\d/g, (d) => PERSIAN_DIGITS[d])
    : "";

/** 106220000 → "۱۰۶٬۲۲۰٬۰۰۰" ; null → "ندارید" */
export const fmtRial = (v) =>
  v === null || v === undefined
    ? "ندارید"
    : toPersianDigits(Number(v).toLocaleString("en-US").replace(/,/g, "٬"));

/** 2 → "۲" ; 0.5 → "۰٫۵" */
export const fmtQty = (v) => toPersianDigits(String(v).replace(".", "٫"));

export const STATUS_LABEL = {
  pending: "در انتظار پاسخ",
  accepted: "تأیید شد",
  rejected: "رد شد",
  cancelled: "لغو شد",
};
