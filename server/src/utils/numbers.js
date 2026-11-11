// Helpers for the mixed Persian/Latin numeric input the dashboard receives.

const PERSIAN_ZERO = 0x06f0; // ۰
const ARABIC_ZERO = 0x0660; // ٠

/** Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits. */
export function toLatinDigits(value) {
  return String(value).replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_ZERO;
    return String(code - base);
  });
}

/**
 * Parse an amount such as 12500000, "12,500,000", "12/500/000" or "۱۲/۵۰۰/۰۰۰"
 * into an integer. Returns NaN when no digits are present.
 */
export function parseInteger(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
  const digits = toLatinDigits(value ?? "").replace(/\D/g, "");
  return digits === "" ? NaN : Number(digits);
}

/** Normalise a Jalali date like "۱۴۰۵/۸/۲" or "1405-08-02" to "1405/08/02". */
export function normalizeJalaliDate(value) {
  const parts = toLatinDigits(value ?? "")
    .trim()
    .split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  if (![y, m, d].every(Number.isInteger)) return null;
  if (y < 1300 || y > 1600 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}
