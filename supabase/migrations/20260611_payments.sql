-- Payments (Model A: money goes straight to each restaurant's own account).
--
-- This migration only adds the payment bookkeeping that is provider-agnostic:
--   * how the order is/was paid (cash or mobile money) and its payment status,
--   * a per-establishment flag telling the customer page whether online mobile
--     payment is available (the actual provider keys live in a separate,
--     owner-only table added when the mobile-money integration lands).

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'mobile_money')),
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
    ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- Public, non-secret flag: shown on the customer checkout to offer mobile money.
ALTER TABLE public.establishments
    ADD COLUMN IF NOT EXISTS mobile_money_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Customers (anon) may set their own order's payment status during checkout
-- (e.g. mark a mobile-money order 'pending'); the existing INSERT policy already
-- lets them create the row. Marking an order 'paid' is done server-side (by a
-- payment webhook using the service role) or by the owner, both of which bypass
-- or satisfy RLS, so no extra anon UPDATE policy is needed here.
