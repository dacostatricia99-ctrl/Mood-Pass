-- Regression tests for 20260830_order_insert_integrity.sql.
--
-- The anon INSERT policy on orders is `WITH CHECK (true)` — RLS alone can't
-- pin individual column values, only whether a row is allowed at all. Before
-- this migration a single forged INSERT could plant an order that starts
-- 'completed' and 'paid', bypassing every lifecycle rule that only governs
-- how an order gets *from* new *to* completed. These assertions run as
-- `anon`, exactly what the customer's browser holds.
--
-- Run with: supabase/tests/run.sh

\set ON_ERROR_STOP on
\set QUIET on
SET client_min_messages TO NOTICE;

-- ----------------------------------------------------------------- helpers --
CREATE OR REPLACE FUNCTION test_assert(cond BOOLEAN, label TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
    RAISE NOTICE '  ok   %', label;
END $$;

CREATE OR REPLACE FUNCTION test_rejects(stmt TEXT, label TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE stmt;
    RAISE EXCEPTION 'FAIL: % — the statement was accepted', label;
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE '  ok   % (%)', label, SQLERRM;
END $$;

\o /dev/null

-- ---------------------------------------------------------------- fixtures --
INSERT INTO auth.users (id, email)
VALUES ('06000000-0000-0000-0000-000000000001', 'owner@example.com');

INSERT INTO public.establishments (id, name, slug, owner_id)
VALUES ('e6000000-0000-0000-0000-000000000001', 'Chez Insert', 'chez-insert',
        '06000000-0000-0000-0000-000000000001');

\echo ''
\echo 'A. An order cannot arrive already settled'

SET ROLE anon;
SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, status, payment_status)
    VALUES ('16000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001',
            'completed', 'paid')$$,
    'status=completed + payment_status=paid in one INSERT is refused');

SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, status, payment_status)
    VALUES ('16000000-0000-0000-0000-000000000002', 'e6000000-0000-0000-0000-000000000001',
            'served', 'unpaid')$$,
    'a status other than new is refused even if unpaid');
RESET ROLE;

\echo ''
\echo 'B. An order cannot arrive pre-paid or pre-locked'

SET ROLE anon;
SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, payment_status)
    VALUES ('16000000-0000-0000-0000-000000000003', 'e6000000-0000-0000-0000-000000000001', 'paid')$$,
    'payment_status=paid on insert is refused');

SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, payment_status)
    VALUES ('16000000-0000-0000-0000-000000000004', 'e6000000-0000-0000-0000-000000000001', 'cash_pending')$$,
    'payment_status=cash_pending on insert is refused');

SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, payment_ref)
    VALUES ('16000000-0000-0000-0000-000000000005', 'e6000000-0000-0000-0000-000000000001', 'deposit-forged')$$,
    'a payment_ref already attached on insert is refused');

SELECT test_rejects($$
    INSERT INTO public.orders (id, establishment_id, cash_received)
    VALUES ('16000000-0000-0000-0000-000000000006', 'e6000000-0000-0000-0000-000000000001', 5000)$$,
    'cash already recorded on insert is refused');
RESET ROLE;

SELECT test_assert(
    (SELECT COUNT(*) FROM public.orders) = 0,
    'none of the forged inserts landed a row');

\echo ''
\echo 'C. The honest path — cash and mobile money — still works'

SET ROLE anon;
INSERT INTO public.orders (id, establishment_id, table_number, payment_method, payment_status)
VALUES ('16000000-0000-0000-0000-000000000007', 'e6000000-0000-0000-0000-000000000001', '3', 'cash', 'unpaid');

INSERT INTO public.orders (id, establishment_id, table_number, payment_method, payment_status)
VALUES ('16000000-0000-0000-0000-000000000008', 'e6000000-0000-0000-0000-000000000001', '3', 'mobile_money', 'pending');
RESET ROLE;

SELECT test_assert(
    (SELECT status FROM public.orders WHERE id = '16000000-0000-0000-0000-000000000007') = 'new',
    'a cash order still opens as new/unpaid');
SELECT test_assert(
    (SELECT status FROM public.orders WHERE id = '16000000-0000-0000-0000-000000000008') = 'new',
    'a mobile-money order still opens as new/pending');

\echo ''
\echo 'All assertions passed.'
