-- Regression tests for 20260825_order_pricing_integrity.sql.
--
-- These cover the security property that the migration exists to enforce: the
-- browser is never the authority on what an order costs. Every statement in
-- the "attack" sections runs as the `anon` role, which is exactly what the
-- customer's browser holds — the anon key ships inside the JS bundle.
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

-- Runs `stmt` expecting the database to refuse it.
CREATE OR REPLACE FUNCTION test_rejects(stmt TEXT, label TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE stmt;
    RAISE EXCEPTION 'FAIL: % — the statement was accepted', label;
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE '  ok   % (%)', label, SQLERRM;
END $$;

-- Assertions report through NOTICE (stderr); the result rows themselves are
-- noise, so drop them. \echo still reaches stdout.
\o /dev/null

-- ---------------------------------------------------------------- fixtures --
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'owner-a@example.com'),
    ('00000000-0000-0000-0000-0000000000b1', 'owner-b@example.com');

INSERT INTO public.establishments (id, name, slug, owner_id) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Chez A', 'chez-a', '00000000-0000-0000-0000-0000000000a1'),
    ('22222222-2222-2222-2222-222222222222', 'Chez B', 'chez-b', '00000000-0000-0000-0000-0000000000b1');

INSERT INTO public.categories (id, establishment_id, name) VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Plats'),
    ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Plats');

INSERT INTO public.products (id, establishment_id, category_id, name, price, is_available) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Pizza',  10000, TRUE),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Soda',     500, TRUE),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Epuise',   700, FALSE),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Autre',      1, TRUE);

\echo ''
\echo 'A. The client does not get to set prices'

SET ROLE anon;
-- The forged request: a 100 total, lines priced at 1 and 0.
INSERT INTO public.orders (id, establishment_id, table_number, total_amount, payment_method, payment_status)
VALUES ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '5', 100, 'mobile_money', 'pending');
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price) VALUES
    ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 1),
    ('99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, 0);
RESET ROLE;

SELECT test_assert(
    (SELECT unit_price FROM public.order_items
      WHERE order_id = '99999999-9999-9999-9999-999999999999'
        AND product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 10000,
    'forged unit_price is replaced by the menu price');

SELECT test_assert(
    (SELECT unit_price FROM public.order_items
      WHERE order_id = '99999999-9999-9999-9999-999999999999'
        AND product_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 500,
    'a zero-priced line is repriced too');

-- 2 x 10000 + 3 x 500 = 21500, against the 100 the client claimed.
SELECT test_assert(
    (SELECT total_amount FROM public.orders WHERE id = '99999999-9999-9999-9999-999999999999') = 21500,
    'total is recomputed from the lines, ignoring the client total');

\echo ''
\echo 'B. A line must reference a real, orderable product of the same establishment'

SET ROLE anon;
SELECT test_rejects($$
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES ('99999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 1)$$,
    'another establishment''s product is refused');

SELECT test_rejects($$
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES ('99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 700)$$,
    'an unavailable product is refused');

SELECT test_rejects($$
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES ('99999999-9999-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 1)$$,
    'an unknown product is refused');
RESET ROLE;

\echo ''
\echo 'C. Once a payment is armed the basket is frozen (TOCTOU guard)'

-- What create-payment now does BEFORE handing the amount to the provider.
UPDATE public.orders SET payment_ref = 'deposit-123'
 WHERE id = '99999999-9999-9999-9999-999999999999';

SET ROLE anon;
SELECT test_rejects($$
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 10000)$$,
    'a line cannot be appended once payment_ref is set');
RESET ROLE;

-- The point of the lock: the amount the provider was given cannot drift.
SELECT test_assert(
    (SELECT total_amount FROM public.orders WHERE id = '99999999-9999-9999-9999-999999999999') = 21500,
    'the total is unchanged after the refused append');

UPDATE public.orders SET payment_ref = NULL, payment_status = 'paid'
 WHERE id = '99999999-9999-9999-9999-999999999999';

SET ROLE anon;
SELECT test_rejects($$
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 10000)$$,
    'a line cannot be appended to a paid order');
RESET ROLE;

\echo ''
\echo 'D. The customer cannot drive their own total back down'

SET ROLE anon;
DELETE FROM public.order_items WHERE order_id = '99999999-9999-9999-9999-999999999999';
UPDATE public.order_items SET unit_price = 1 WHERE order_id = '99999999-9999-9999-9999-999999999999';
UPDATE public.orders SET total_amount = 1 WHERE id = '99999999-9999-9999-9999-999999999999';
RESET ROLE;

SELECT test_assert(
    (SELECT COUNT(*) FROM public.order_items WHERE order_id = '99999999-9999-9999-9999-999999999999') = 2,
    'anon cannot delete order lines');
SELECT test_assert(
    (SELECT total_amount FROM public.orders WHERE id = '99999999-9999-9999-9999-999999999999') = 21500,
    'anon can neither reprice a line nor rewrite the order total');

\echo ''
\echo 'E. The honest path and the existing RLS still behave'

SET ROLE anon;
INSERT INTO public.orders (id, establishment_id, table_number, total_amount, payment_method, payment_status)
VALUES ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '7', 20500, 'cash', 'unpaid');
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price) VALUES
    ('88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 10000),
    ('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 500);

SELECT test_assert((SELECT COUNT(*) FROM public.orders) = 0, 'anon still cannot read orders back');
RESET ROLE;

SELECT test_assert(
    (SELECT total_amount FROM public.orders WHERE id = '88888888-8888-8888-8888-888888888888') = 20500,
    'an honest cart is priced exactly as the menu says');

\echo ''
\echo 'F. The owner still sees their own orders'

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
SET ROLE authenticated;
SELECT test_assert((SELECT COUNT(*) FROM public.orders) = 2, 'the establishment owner reads their two orders');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
SET ROLE authenticated;
SELECT test_assert((SELECT COUNT(*) FROM public.orders) = 0, 'another owner reads none of them');
RESET ROLE;

\echo ''
\echo 'All assertions passed.'
