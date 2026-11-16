import { toPersianDigits } from "../utils/format";

/** Short glyph on the coin medallion. */
const GLYPH = { "mithqal-tomorrow": "مثقال", "mithqal-day-after": "مثقال", "coin-full-86": "تمام", "coin-half-86": "نیم", "coin-quarter-86": "ربع", "coin-full-old": "تمام", "coin-half-old": "نیم", "coin-quarter-old": "ربع", "gram18-tomorrow": toPersianDigits(18) };

export function Coin({ code }) {
  const silver = code?.startsWith("silver");
  return (
    <span className={`gp-coin${silver ? " silver" : ""}`} aria-hidden="true" style={{ fontSize: GLYPH[code]?.length > 3 ? 11 : 13 }}>
      {silver ? "نقره" : (GLYPH[code] ?? "طلا")}
    </span>
  );
}

export function Status({ status }) {
  const label = { pending: "در انتظار پاسخ", accepted: "تأیید شد", rejected: "رد شد", cancelled: "لغو شد" }[status];
  return <span className={`gp-badge ${status}`}>{label}</span>;
}

export const SideTag = ({ side }) => (
  <span className={`gp-side ${side}`}>{side === "buy" ? "خرید" : "فروش"}</span>
);
