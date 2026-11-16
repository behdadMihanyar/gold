import { toLatinDigits } from "../../utils/numbers.js";

/**
 * Compare product names the way a person would: Arabic/Persian letter variants,
 * digits, half-spaces and word order don't matter.
 *   "تمام سکه ۸۶" ≡ "سکه تمام 86" ≡ "تمام‌سکه ۸۶"
 */
export function nameKey(name) {
  return toLatinDigits(String(name ?? ""))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٟـ]/g, "") // harakat, tatweel
    .replace(/[‌‏‎\s,،\-_/]+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

/**
 * Link collector items to products by name, only where it's unambiguous: the
 * product has no collector id yet, the id isn't used elsewhere, and exactly one
 * product and one item share the name. Returns the number of links made.
 */
export async function autoMapByName(db, items) {
  const named = items.filter((i) => i.name);
  if (!named.length) return 0;

  const { rows: products } = await db.query(
    "SELECT id, name FROM products WHERE source_id IS NULL",
  );
  const { rows: used } = await db.query(
    "SELECT source_id FROM products WHERE source_id IS NOT NULL",
  );
  const taken = new Set(used.map((r) => Number(r.source_id)));

  const byKey = (list, key) => {
    const m = new Map();
    for (const x of list) {
      const k = nameKey(x[key]);
      if (k) m.set(k, m.has(k) ? null : x); // null marks "ambiguous"
    }
    return m;
  };
  const productsByName = byKey(products, "name");
  const itemsByName = byKey(named, "name");

  let linked = 0;
  for (const [k, item] of itemsByName) {
    const product = productsByName.get(k);
    if (!item || !product || taken.has(item.id)) continue;
    const res = await db.query(
      "UPDATE products SET source_id = $1 WHERE id = $2 AND source_id IS NULL RETURNING id",
      [item.id, product.id],
    );
    if (res.rows[0]) {
      taken.add(item.id);
      linked++;
    }
  }
  return linked;
}
