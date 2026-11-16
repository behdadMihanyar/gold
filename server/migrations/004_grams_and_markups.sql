-- 1) Products can be priced per one unit but ordered in another: آبشده is quoted per
--    mithqal (4.608 g) while customers state the weight in grams.
--      unit        what the customer enters (گرم)
--      price_unit  what the price is per (مثقال); NULL = same as unit
--      price_per   how many `unit`s one price_unit is (4.608)
-- 2) Admin markups: the price shown to customers is the source price plus a signed
--    amount per side (e.g. +500,000 on buy, -300,000 on sell).
ALTER TABLE products
  ADD COLUMN price_unit  TEXT,
  ADD COLUMN price_per   NUMERIC(10,4) NOT NULL DEFAULT 1 CHECK (price_per > 0),
  ADD COLUMN buy_adjust  BIGINT        NOT NULL DEFAULT 0,
  ADD COLUMN sell_adjust BIGINT        NOT NULL DEFAULT 0;

UPDATE products
   SET unit = 'گرم', price_unit = 'مثقال', price_per = 4.608,
       min_quantity = 0.1, max_quantity = 5000, quantity_step = 0.001
 WHERE code IN ('mithqal-tomorrow', 'mithqal-day-after');

-- Requests keep their own snapshot so old ones stay correct if a product changes.
ALTER TABLE trade_requests
  ADD COLUMN price_unit TEXT,
  ADD COLUMN price_per  NUMERIC(10,4) NOT NULL DEFAULT 1 CHECK (price_per > 0);
ALTER TABLE trade_requests DROP COLUMN total;
ALTER TABLE trade_requests
  ADD COLUMN total BIGINT GENERATED ALWAYS AS (round(quantity * unit_price / price_per)::bigint) STORED;
