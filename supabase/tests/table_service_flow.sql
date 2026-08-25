-- End-to-end test of the table-service journey.
--
--   QR table -> menu -> cart -> validation -> kitchen -> preparing -> ready
--   -> server -> served -> bill -> cash -> change -> completed
--
-- The rule this file exists to protect: payment never blocks the kitchen. The
-- order is cooked, finished and served while the payment is still UNPAID, and
-- only the final close waits on the money.
--
-- The customer's statements run as `anon` and the staff's as `authenticated`,
-- matching who actually holds which role in production.

\set ON_ERROR_STOP on
\set QUIET on
SET client_min_messages TO NOTICE;

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
VALUES ('05000000-0000-0000-0000-000000000001', 'patron@example.com');

INSERT INTO public.establishments (id, name, slug, owner_id)
VALUES ('e5700000-0000-0000-0000-000000000001', 'Le Maquis', 'le-maquis',
        '05000000-0000-0000-0000-000000000001');

INSERT INTO public.categories (id, establishment_id, name)
VALUES ('c5700000-0000-0000-0000-000000000001', 'e5700000-0000-0000-0000-000000000001', 'Carte');

-- 6000 + 3500 = 9500, the worked example from the spec.
INSERT INTO public.products (id, establishment_id, category_id, name, price, is_available) VALUES
    ('40000000-0000-0000-0000-000000000001', 'e5700000-0000-0000-0000-000000000001', 'c5700000-0000-0000-0000-000000000001', 'Poulet braise', 6000, TRUE),
    ('40000000-0000-0000-0000-000000000002', 'e5700000-0000-0000-0000-000000000001', 'c5700000-0000-0000-0000-000000000001', 'Jus de bissap', 3500, TRUE);

\echo ''
\echo '1. The customer scans the QR on table 12 and validates the cart'

SET ROLE anon;
INSERT INTO public.orders (id, establishment_id, table_number, payment_method, payment_status)
VALUES ('0d000000-0000-0000-0000-000000000001', 'e5700000-0000-0000-0000-000000000001', '12', 'cash', 'unpaid');
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price) VALUES
    ('0d000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 6000),
    ('0d000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 1, 3500);
RESET ROLE;

SELECT test_assert(
    (SELECT status FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001') = 'new',
    'the order lands as NEW');
SELECT test_assert(
    (SELECT table_number FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001') = '12',
    'the table travelled with the QR, not typed by the customer');
SELECT test_assert(
    (SELECT total_amount FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001') = 9500,
    'the bill totals 9500');

\echo ''
\echo '2. The kitchen works the order while it is still UNPAID'

SELECT set_config('request.jwt.claim.sub', '05000000-0000-0000-0000-000000000001', false);
SET ROLE authenticated;

-- The kitchen queue is status-driven only; nothing here consults payment.
SELECT test_assert(
    (SELECT COUNT(*) FROM public.orders
      WHERE establishment_id = 'e5700000-0000-0000-0000-000000000001'
        AND status IN ('new', 'preparing')) = 1,
    'an unpaid order is in the kitchen queue like any other');

UPDATE public.orders SET status = 'preparing' WHERE id = '0d000000-0000-0000-0000-000000000001';
SELECT test_assert(
    (SELECT status = 'preparing' AND payment_status = 'unpaid'
       FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001'),
    'PREPARING + UNPAID is a valid state');

UPDATE public.orders SET status = 'ready' WHERE id = '0d000000-0000-0000-0000-000000000001';
UPDATE public.orders SET status = 'served' WHERE id = '0d000000-0000-0000-0000-000000000001';
SELECT test_assert(
    (SELECT status = 'served' AND payment_status = 'unpaid'
       FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001'),
    'the food is served before a franc has changed hands');

\echo ''
\echo '3. Only the final close waits on the money'

SELECT test_rejects($$
    UPDATE public.orders SET status = 'completed'
     WHERE id = '0d000000-0000-0000-0000-000000000001'$$,
    'an unpaid order cannot be closed');

\echo ''
\echo '4. The server brings the bill and takes the cash at the table'

UPDATE public.orders SET payment_status = 'cash_pending'
 WHERE id = '0d000000-0000-0000-0000-000000000001';
SELECT test_assert(
    (SELECT payment_status FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001') = 'cash_pending',
    'the bill is out: payment is CASH_PENDING');

SELECT test_rejects($$
    UPDATE public.orders SET status = 'completed'
     WHERE id = '0d000000-0000-0000-0000-000000000001'$$,
    'a bill merely handed over is still not payment');

-- 10 000 handed over against 9 500.
UPDATE public.orders SET payment_status = 'paid', cash_received = 10000
 WHERE id = '0d000000-0000-0000-0000-000000000001';

SELECT test_assert(
    (SELECT cash_received - total_amount FROM public.orders
      WHERE id = '0d000000-0000-0000-0000-000000000001') = 500,
    'change owed back is 500');

\echo ''
\echo '5. Now the order can be closed'

UPDATE public.orders SET status = 'completed' WHERE id = '0d000000-0000-0000-0000-000000000001';
SELECT test_assert(
    (SELECT status = 'completed' AND payment_status = 'paid'
       FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001'),
    'a served and settled order closes');

\echo ''
\echo '6. The same table orders again without touching the first order'

RESET ROLE;
SET ROLE anon;
INSERT INTO public.orders (id, establishment_id, table_number, payment_method, payment_status)
VALUES ('0d000000-0000-0000-0000-000000000002', 'e5700000-0000-0000-0000-000000000001', '12', 'cash', 'unpaid');
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES ('0d000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 2, 3500);
RESET ROLE;

SELECT test_assert(
    (SELECT COUNT(*) FROM public.orders
      WHERE establishment_id = 'e5700000-0000-0000-0000-000000000001' AND table_number = '12') = 2,
    'table 12 now carries two distinct orders');
SELECT test_assert(
    (SELECT status = 'completed' AND payment_status = 'paid' AND total_amount = 9500
       FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000001'),
    'the first order is untouched by the second');
SELECT test_assert(
    (SELECT status = 'new' AND payment_status = 'unpaid' AND total_amount = 7000
       FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000002'),
    'the second order starts its own lifecycle');

\echo ''
\echo '7. Cancelling never waits on payment'

SELECT set_config('request.jwt.claim.sub', '05000000-0000-0000-0000-000000000001', false);
SET ROLE authenticated;
UPDATE public.orders SET status = 'cancelled' WHERE id = '0d000000-0000-0000-0000-000000000002';
SELECT test_assert(
    (SELECT status FROM public.orders WHERE id = '0d000000-0000-0000-0000-000000000002') = 'cancelled',
    'an unpaid order can still be cancelled');
RESET ROLE;

\echo ''
\echo 'Table-service journey complete.'
