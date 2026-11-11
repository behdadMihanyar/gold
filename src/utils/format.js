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
