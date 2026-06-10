-- Ownership & access control for MoodPass.
--
-- Until now every table had RLS enabled but only public SELECT policies (and a
-- couple of open INSERT policies for orders). That means menus are public to
-- read, but nobody could securely *manage* a menu. This migration introduces an
-- owner per establishment and scopes all writes to that owner, while keeping the
-- customer-facing flows (read menu, place order) anonymous.

-- 1. Link each establishment to its owner (a Supabase auth user).
ALTER TABLE public.establishments
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_establishments_owner ON public.establishments(owner_id);

-- 2. Helper: does the current user own the given establishment?
--    SECURITY DEFINER so it can read establishments regardless of the caller's
--    own RLS context; STABLE since it only reads within the transaction.
CREATE OR REPLACE FUNCTION public.owns_establishment(est_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.establishments e
        WHERE e.id = est_id
          AND e.owner_id = auth.uid()
    );
$$;

-- 3. Establishments: public read stays; owners manage their own.
CREATE POLICY "Owners can create their establishment"
ON public.establishments FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their establishment"
ON public.establishments FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their establishment"
ON public.establishments FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- 4. Categories: public read stays; owners manage rows of their establishments.
CREATE POLICY "Owners manage their categories"
ON public.categories FOR ALL TO authenticated
USING (public.owns_establishment(establishment_id))
WITH CHECK (public.owns_establishment(establishment_id));

-- 5. Products: same model.
CREATE POLICY "Owners manage their products"
ON public.products FOR ALL TO authenticated
USING (public.owns_establishment(establishment_id))
WITH CHECK (public.owns_establishment(establishment_id));

-- 6. Orders: customers (anonymous) keep INSERT; reads/updates restricted to the
--    owning establishment. Replace the previous "anyone can read" policies.
DROP POLICY IF EXISTS "Anyone can read an order if they have the ID." ON public.orders;

CREATE POLICY "Owners read their orders"
ON public.orders FOR SELECT TO authenticated
USING (public.owns_establishment(establishment_id));

CREATE POLICY "Owners update their orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.owns_establishment(establishment_id))
WITH CHECK (public.owns_establishment(establishment_id));

-- 7. Order items: customers keep INSERT; reads restricted to the owner.
DROP POLICY IF EXISTS "Anyone can read order items." ON public.order_items;

CREATE POLICY "Owners read their order items"
ON public.order_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_id
          AND public.owns_establishment(o.establishment_id)
    )
);
