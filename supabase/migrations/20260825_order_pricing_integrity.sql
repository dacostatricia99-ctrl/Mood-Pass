-- Server-side authority over order pricing.
--
-- Until now an order's total_amount and each line's unit_price were simply
-- whatever the browser sent: the anonymous INSERT policies accept any value and
-- nothing ever compared them with the real product prices. The anon key ships
-- inside the JS bundle, so anyone could POST an order priced at 100 instead of
-- 10 000 and then settle that amount through the mobile-money flow — the
-- create-payment function charges whatever orders.total_amount says.
--
-- This migration makes prices *derived* rather than supplied: every line's
-- unit_price is overwritten with the product's current price, and the order's
-- total_amount is recomputed from its own lines. Amounts sent by the client are
-- ignored entirely, so a tampered request buys nothing.

-- 1. The total is never a client-supplied value. It starts at zero and is built
--    up by the order_items triggers below. The DEFAULT keeps inserts that omit
--    the column (the intended shape from now on) valid.
ALTER TABLE public.orders ALTER COLUMN total_amount SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.orders_reset_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.total_amount := 0;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER orders_reset_total_before_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_reset_total();

-- 2. A line is priced from the products table, never from the request.
--
--    SECURITY DEFINER because the trigger runs as the anonymous customer, who
--    (by design) cannot SELECT orders at all and would otherwise see neither the
--    parent order nor a way to validate it.
CREATE OR REPLACE FUNCTION public.order_items_apply_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ord  public.orders%ROWTYPE;
    prod public.products%ROWTYPE;
BEGIN
    SELECT * INTO ord FROM public.orders WHERE id = NEW.order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown order %', NEW.order_id;
    END IF;

    -- Once a payment has been initiated (payment_ref set) or completed, the
    -- basket is frozen. Without this a customer could pay a small total and
    -- then append expensive lines to the very same order.
    IF ord.payment_status = 'paid' OR ord.payment_ref IS NOT NULL THEN
        RAISE EXCEPTION 'Order % is locked for payment', NEW.order_id;
    END IF;

    SELECT * INTO prod FROM public.products WHERE id = NEW.product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown product %', NEW.product_id;
    END IF;

    -- A line may only reference a product of the order's own establishment,
    -- otherwise one restaurant's cheap menu could be used to price another's.
    IF prod.establishment_id <> ord.establishment_id THEN
        RAISE EXCEPTION 'Product % does not belong to establishment %',
            NEW.product_id, ord.establishment_id;
    END IF;

    IF NOT prod.is_available THEN
        RAISE EXCEPTION 'Product % is not available', NEW.product_id;
    END IF;

    NEW.unit_price := prod.price;
    RETURN NEW;
END;
$$;

-- INSERT only: a manager editing an existing line (a discount, a correction) is
-- the merchant and stays free to set their own price.
CREATE OR REPLACE TRIGGER order_items_apply_price_before_insert
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_items_apply_price();

-- 3. The order total always mirrors the sum of its lines.
CREATE OR REPLACE FUNCTION public.order_items_sync_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target UUID := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
    UPDATE public.orders o
    SET total_amount = COALESCE((
        SELECT SUM(i.quantity * i.unit_price)
        FROM public.order_items i
        WHERE i.order_id = target
    ), 0)
    WHERE o.id = target;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER order_items_sync_total_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_items_sync_total();

-- 4. Re-derive the totals of orders that are still open, so existing rows match
--    the new invariant. Paid orders are deliberately left untouched: their
--    total_amount is the amount that was actually charged, and rewriting it
--    would falsify the books — and quietly paper over any past tampering.
UPDATE public.orders o
SET total_amount = derived.amount
FROM (
    SELECT o2.id,
           COALESCE((
               SELECT SUM(i.quantity * i.unit_price)
               FROM public.order_items i
               WHERE i.order_id = o2.id
           ), 0) AS amount
    FROM public.orders o2
    WHERE o2.payment_status <> 'paid'
) AS derived
WHERE o.id = derived.id
  AND o.total_amount IS DISTINCT FROM derived.amount;
