// Jalali (Persian) calendar helpers. The shop works in Iran Standard Time, so
// "today" is always computed in Asia/Tehran, not in the server's time zone.

const formatter = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "1405/08/25" for the given instant (default: now). */
export function toJalali(date = new Date()) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}/${parts.month}/${parts.day}`;
}
