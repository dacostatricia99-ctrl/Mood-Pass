-- Customer-facing order tracking.
--
-- Anonymous customers cannot SELECT orders (RLS restricts reads to the owning
-- establishment). But a customer who just placed an order knows its UUID, and
-- should be able to follow its status. We expose a narrow SECURITY DEFINER
-- function that returns ONLY the status for a given order id — knowing the
-- (unguessable) UUID acts as a capability, and there is no way to enumerate or
-- read anything else.

CREATE OR REPLACE FUNCTION public.get_order_status(order_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT status FROM public.orders WHERE id = order_id;
$$;

-- Lock down, then grant execute to the customer-facing roles.
REVOKE ALL ON FUNCTION public.get_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(UUID) TO anon, authenticated;
