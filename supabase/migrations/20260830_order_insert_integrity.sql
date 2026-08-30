-- Close the last gap in order integrity: what an anonymous customer is
-- allowed to state when *creating* an order, not just when adding lines to
-- one.
--
-- The anon INSERT policy on orders is still `WITH CHECK (true)` (it predates
-- this migration and stays — RLS alone can't express "some columns, but only
-- these values"). orders_guard_completion only rejects status='completed'
-- paired with an unpaid order; it says nothing about a single INSERT that
-- arrives already 'completed' AND 'paid'. total_amount is reset to 0 by
-- orders_reset_total either way, so this buys no money — but it does let
-- anyone plant fake completed/paid orders (table_number, client_name and all)
-- straight into the manager's dashboard and revenue stats.
--
-- The application never inserts anything but a fresh order: status is left
-- at its 'new' default, payment_status is 'unpaid' (cash) or 'pending'
-- (mobile money), and payment_ref/cash_received start empty (see
-- src/lib/orderApi.ts:createOrder — the only place client code inserts into
-- orders). Every other write is an UPDATE: anon holds no UPDATE policy on
-- orders at all (RLS restricts it to `authenticated` owners), and the
-- payment webhooks that mark an order paid run as the service role, which
-- bypasses RLS but not this trigger — and never issues an INSERT, only
-- UPDATE. Rejecting anything else at INSERT time is therefore safe for every
-- real caller and closes the hole for a forged one.

CREATE OR REPLACE FUNCTION public.orders_guard_insert_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status <> 'new' THEN
        RAISE EXCEPTION 'A new order must start as new, not %', NEW.status;
    END IF;
    IF NEW.payment_status NOT IN ('unpaid', 'pending') THEN
        RAISE EXCEPTION 'A new order cannot start with payment_status %', NEW.payment_status;
    END IF;
    IF NEW.payment_ref IS NOT NULL THEN
        RAISE EXCEPTION 'A new order cannot start with a payment reference already attached';
    END IF;
    IF NEW.cash_received IS NOT NULL THEN
        RAISE EXCEPTION 'A new order cannot start with cash already recorded';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER orders_guard_insert_state_before_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_insert_state();
