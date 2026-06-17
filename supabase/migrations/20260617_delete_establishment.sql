-- Lets a manager delete their own establishment safely.
--
-- A plain DELETE can hit the order_items -> products RESTRICT FK, and owners
-- have no DELETE policy on orders. This SECURITY DEFINER function checks
-- ownership, then removes order lines, orders, and the establishment (which
-- cascades its categories/products/subscription/payment config).

CREATE OR REPLACE FUNCTION public.delete_establishment(est_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = est_id AND owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE establishment_id = est_id);
    DELETE FROM public.orders WHERE establishment_id = est_id;
    DELETE FROM public.establishments WHERE id = est_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_establishment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_establishment(UUID) TO authenticated;