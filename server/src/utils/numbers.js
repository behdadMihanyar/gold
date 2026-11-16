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

/**
 * Parse a quantity such as 2, "2.5", "۲٫۵" (Persian decimal separator) into a
 * number with at most 3 decimals. Returns NaN for anything else — notably no
 * thousands separators, so "1,000" is rejected rather than guessed at.
 */
export function parseQuantity(value) {
  if (typeof value === "number") {
    // Same rule as for text: at most 3 decimals (1.2345 is refused, never rounded).
    return Number.isFinite(value) && Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6
      ? value
      : NaN;
  }
  const text = toLatinDigits(value ?? "").trim().replace("٫", ".");
  return /^\d+(\.\d{1,3})?$/.test(text) ? Number(text) : NaN;
}

/** Escape LIKE wildcards so user input matches literally, then wrap for "contains". */
export function likeContains(text) {
  return `%${String(text).replace(/[\\%_]/g, "\\$&")}%`;
}
