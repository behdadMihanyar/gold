-- The collector now reports each Hanzaei product's name, so products can be linked
-- to their collector id automatically (by name) and the admin sees names, not bare ids.
ALTER TABLE price_feed_items ADD COLUMN name TEXT;
