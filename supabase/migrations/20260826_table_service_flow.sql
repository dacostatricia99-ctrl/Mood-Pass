-- Table service: the order lifecycle and the payment lifecycle become
-- independent of one another.
--
-- The kitchen must never wait on money. The customer sits down, scans the QR
-- glued to their table, orders, and the ticket reaches the kitchen immediately;
-- the bill is settled in cash at the table once the food has been served. An
-- order that is PREPARING while its payment is still UNPAID is therefore an
-- ordinary, valid state — not an anomaly to be reconciled.
--
--   order   : new -> preparing -> ready -> served -> completed   (or cancelled)
--   payment : unpaid -> cash_pending -> paid                     (cash at table)
--             unpaid -> pending      -> paid                     (mobile money)
--
-- Naming note, and the reason for the remap below: the old `completed` status
-- was what the kitchen's "mark ready" button wrote, and the customer's tracker
-- rendered it as "ready". Its real meaning was READY, so that is what it
-- migrates to. `completed` now means something new — served and settled.

-- 1. Order lifecycle -------------------------------------------------------
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE public.orders SET status = CASE status
    WHEN 'pending'   THEN 'new'
    WHEN 'accepted'  THEN 'preparing'
    WHEN 'completed' THEN 'ready'
    ELSE status
END
WHERE status IN ('pending', 'accepted', 'completed');

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('new', 'preparing', 'ready', 'served', 'completed', 'cancelled'));

-- 2. Payment lifecycle -----------------------------------------------------
--    `cash_pending` is the window between the server bringing the bill to the
--    table and the cash actually being handed over. `pending` stays for a
--    mobile-money deposit that is in flight with the provider.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'cash_pending', 'paid'));

-- What the customer handed over, so the change given back is auditable rather
-- than a number that only ever existed on the server's screen.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10, 2);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cash_received_nonneg;
ALTER TABLE public.orders ADD CONSTRAINT orders_cash_received_nonneg
    CHECK (cash_received IS NULL OR cash_received >= 0);

-- 3. The one place where the two lifecycles do meet ------------------------
--    Payment never gates the kitchen, so nothing constrains new/preparing/
--    ready/served. It gates only the final close: an order is completed when
--    it has been both served and settled. Cancelling stays always available.
CREATE OR REPLACE FUNCTION public.orders_guard_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.payment_status <> 'paid' THEN
        RAISE EXCEPTION 'Order % cannot be completed while payment is %',
            NEW.id, NEW.payment_status;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER orders_guard_completion_before_write
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_completion();

-- 4. A table runs several orders over an evening, and the manager view reads
--    them per table; without this that is a sequential scan per lookup.
CREATE INDEX IF NOT EXISTS idx_orders_establishment_table
    ON public.orders (establishment_id, table_number, created_at DESC);
