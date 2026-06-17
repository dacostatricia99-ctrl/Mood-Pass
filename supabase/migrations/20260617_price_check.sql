-- Prevent negative prices (and totals) entering the system.
ALTER TABLE public.products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0);
ALTER TABLE public.orders ADD CONSTRAINT orders_total_nonneg CHECK (total_amount >= 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_unit_price_nonneg CHECK (unit_price >= 0);
