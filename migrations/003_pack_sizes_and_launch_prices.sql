-- Pack-size selling (e.g. chocolates sold as 5/10/20/50/100 pieces) and initial launch pricing.
-- pack_sizes = null  -> sold singly (quantity 1..20 units), the previous behaviour.
-- pack_sizes = {...} -> quantity (in units/pieces) MUST be exactly one of these values.

alter table products add column if not exists pack_sizes int[]
  check (pack_sizes is null or (cardinality(pack_sizes) between 1 and 12 and array_position(pack_sizes, null) is null and 0 < all (pack_sizes)));

-- Owner-supplied prices. Only fills products that have no price yet, so later admin edits are never overwritten.
-- Chocolates: Rs 10 per piece, sold in packs of 5, 10, 20, 50 or 100 pieces.
update products set price_paise = 1000, pack_label = 'per piece', pack_sizes = '{5,10,20,50,100}'
 where category_id = 'chocolates' and price_paise is null;
-- Podis: Rs 150 per 250 g packet, sold singly.
update products set price_paise = 15000, pack_label = '250 g'
 where category_id = 'podis' and price_paise is null;
-- NOTE: stock and "available" are deliberately left untouched (stock 0, unavailable).
-- Set real stock and tick "Available for sale" in Admin > Products to open each product for ordering.
