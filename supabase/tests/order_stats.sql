-- Tests for get_order_stats.
--
-- The numbers below are worked out by hand and asserted against the SQL here,
-- and against the TypeScript computeStats() used for the demo data in
-- src/lib/managerApi.test.ts. Two independent implementations agreeing on the
-- same hand-computed figures is the point: the stats screen shows whichever
-- one is in play, so they must not drift apart.
--
-- Fixture (day_start = 2026-08-25 00:00+00), prices Margherita 3500,
-- Coca 1000, Reine 4500, Eau 500:
--
--   O1 today      2x Margherita              =  7000
--   O2 today      1x Reine                   =  4500
--   O3 1 day ago  1x Reine + 1x Eau          =  5000
--   O4 3 days ago 3x Margherita + 2x Coca    = 12500
--   O5 8 days ago 4x Coca                    =  4000   (outside the 7-day chart)
--   O6 today      5x Margherita, CANCELLED   = 17500   (excluded everywhere)
--
--   revenueToday 11500 · ordersToday 2 · totalRevenue 33000 · orders 5
--   top: Coca 6, Margherita 5, Reine 2, Eau 1

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
INSERT INTO auth.users (id, email) VALUES
    ('57a70000-0000-0000-0000-000000000001', 'stats-owner@example.com'),
    ('57a70000-0000-0000-0000-000000000002', 'someone-else@example.com');

INSERT INTO public.establishments (id, name, slug, owner_id)
VALUES ('57a70000-0000-0000-0000-0000000000e1', 'Chez Stats', 'chez-stats',
        '57a70000-0000-0000-0000-000000000001');

INSERT INTO public.categories (id, establishment_id, name)
VALUES ('57a70000-0000-0000-0000-0000000000c1', '57a70000-0000-0000-0000-0000000000e1', 'Carte');

INSERT INTO public.products (id, establishment_id, category_id, name, price, is_available) VALUES
    ('57a70000-0000-0000-0000-0000000000a1', '57a70000-0000-0000-0000-0000000000e1', '57a70000-0000-0000-0000-0000000000c1', 'Margherita', 3500, TRUE),
    ('57a70000-0000-0000-0000-0000000000a2', '57a70000-0000-0000-0000-0000000000e1', '57a70000-0000-0000-0000-0000000000c1', 'Coca-Cola',  1000, TRUE),
    ('57a70000-0000-0000-0000-0000000000a3', '57a70000-0000-0000-0000-0000000000e1', '57a70000-0000-0000-0000-0000000000c1', 'Reine',      4500, TRUE),
    ('57a70000-0000-0000-0000-0000000000a4', '57a70000-0000-0000-0000-0000000000e1', '57a70000-0000-0000-0000-0000000000c1', 'Eau',         500, TRUE);

-- total_amount is derived from the lines by a trigger, so the fixture only
-- states quantities and lets the database price them.
INSERT INTO public.orders (id, establishment_id, created_at) VALUES
    ('57a70000-0000-0000-0000-0000000000d1', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' + INTERVAL '10 hours'),
    ('57a70000-0000-0000-0000-0000000000d2', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' + INTERVAL '12 hours'),
    ('57a70000-0000-0000-0000-0000000000d3', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' - INTERVAL '1 day' + INTERVAL '12 hours'),
    ('57a70000-0000-0000-0000-0000000000d4', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' - INTERVAL '3 days' + INTERVAL '12 hours'),
    ('57a70000-0000-0000-0000-0000000000d5', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' - INTERVAL '8 days' + INTERVAL '12 hours'),
    ('57a70000-0000-0000-0000-0000000000d6', '57a70000-0000-0000-0000-0000000000e1', TIMESTAMPTZ '2026-08-25 00:00:00+00' + INTERVAL '13 hours');

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price) VALUES
    ('57a70000-0000-0000-0000-0000000000d1', '57a70000-0000-0000-0000-0000000000a1', 2, 0),
    ('57a70000-0000-0000-0000-0000000000d2', '57a70000-0000-0000-0000-0000000000a3', 1, 0),
    ('57a70000-0000-0000-0000-0000000000d3', '57a70000-0000-0000-0000-0000000000a3', 1, 0),
    ('57a70000-0000-0000-0000-0000000000d3', '57a70000-0000-0000-0000-0000000000a4', 1, 0),
    ('57a70000-0000-0000-0000-0000000000d4', '57a70000-0000-0000-0000-0000000000a1', 3, 0),
    ('57a70000-0000-0000-0000-0000000000d4', '57a70000-0000-0000-0000-0000000000a2', 2, 0),
    ('57a70000-0000-0000-0000-0000000000d5', '57a70000-0000-0000-0000-0000000000a2', 4, 0),
    ('57a70000-0000-0000-0000-0000000000d6', '57a70000-0000-0000-0000-0000000000a1', 5, 0);

UPDATE public.orders SET status = 'cancelled'
 WHERE id = '57a70000-0000-0000-0000-0000000000d6';

-- ------------------------------------------------------------------ tests --
SELECT set_config('request.jwt.claim.sub', '57a70000-0000-0000-0000-000000000001', false);
SET ROLE authenticated;

CREATE TEMP TABLE s AS
SELECT public.get_order_stats(
    '57a70000-0000-0000-0000-0000000000e1',
    TIMESTAMPTZ '2026-08-25 00:00:00+00') AS j;

\echo ''
\echo 'Totals'
SELECT test_assert((SELECT (j->>'revenueToday')::numeric FROM s) = 11500, 'revenue today is 11 500');
SELECT test_assert((SELECT (j->>'ordersToday')::int FROM s) = 2, 'two orders today');
SELECT test_assert((SELECT (j->>'totalRevenue')::numeric FROM s) = 33000,
    'total revenue counts the order older than the chart window');
SELECT test_assert((SELECT (j->>'orders')::int FROM s) = 5, 'the cancelled order is excluded from the count');

\echo ''
\echo 'Top products'
SELECT test_assert((SELECT j->'topProducts'->0->>'name' FROM s) = 'Coca-Cola', 'Coca-Cola leads with 6 sold');
SELECT test_assert((SELECT (j->'topProducts'->0->>'qty')::int FROM s) = 6, 'its quantity is 6');
SELECT test_assert((SELECT j->'topProducts'->1->>'name' FROM s) = 'Margherita', 'Margherita is second');
SELECT test_assert((SELECT (j->'topProducts'->1->>'qty')::int FROM s) = 5, 'with 5 sold — the cancelled order''s 5 are not added');
SELECT test_assert((SELECT jsonb_array_length(j->'topProducts') FROM s) = 4, 'four distinct products were sold');

\echo ''
\echo 'Seven-day chart'
SELECT test_assert((SELECT jsonb_array_length(j->'days') FROM s) = 7, 'seven buckets');
SELECT test_assert((SELECT (j->'days'->6->>'value')::numeric FROM s) = 11500, 'today closes the series');
SELECT test_assert((SELECT (j->'days'->5->>'value')::numeric FROM s) = 5000, 'yesterday is 5 000');
SELECT test_assert((SELECT (j->'days'->3->>'value')::numeric FROM s) = 12500, 'three days ago is 12 500');
SELECT test_assert((SELECT (j->'days'->0->>'value')::numeric FROM s) = 0, 'six days ago is empty');
SELECT test_assert(
    (SELECT SUM((d->>'value')::numeric) FROM s, jsonb_array_elements(s.j->'days') d) = 29000,
    'the chart sums to 29 000 — 4 000 of revenue predates it');

\echo ''
\echo 'Access'
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '57a70000-0000-0000-0000-000000000002', false);
SET ROLE authenticated;
SELECT test_rejects($$
    SELECT public.get_order_stats('57a70000-0000-0000-0000-0000000000e1',
                                  TIMESTAMPTZ '2026-08-25 00:00:00+00')$$,
    'another manager cannot read these stats');
RESET ROLE;

SELECT test_rejects($$
    SET LOCAL ROLE anon;
    SELECT public.get_order_stats('57a70000-0000-0000-0000-0000000000e1',
                                  TIMESTAMPTZ '2026-08-25 00:00:00+00')$$,
    'the anonymous customer role cannot execute it at all');

-- The check above would also pass on the ownership test alone, which fires for
-- anyone whose auth.uid() is null. This one is about the grant itself: Supabase
-- hands anon EXECUTE on new public functions by default, and REVOKE ... FROM
-- PUBLIC does not take it back.
SELECT test_assert(
    NOT has_function_privilege('anon', 'public.get_order_stats(uuid, timestamptz)', 'EXECUTE'),
    'anon holds no EXECUTE grant on it either');

\echo ''
\echo 'Stats aggregation verified.'
