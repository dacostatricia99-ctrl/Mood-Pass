-- Server-side aggregation for the stats screen.
--
-- StatsView used to pull every order the establishment had ever taken, with its
-- line items and joined products, and reduce them in the browser. That is both
-- expensive and quietly wrong at volume: PostgREST caps a response at max_rows
-- (1000), so past a thousand orders the "total revenue" silently became "revenue
-- over the last thousand orders" with nothing on screen to say so.
--
-- Aggregating here is correct at any volume and returns a few hundred bytes.
-- The caller passes its own start-of-today, so the day boundaries follow the
-- restaurant's local timezone rather than the server's.

CREATE OR REPLACE FUNCTION public.get_order_stats(est_id UUID, day_start TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- SECURITY DEFINER bypasses RLS, so ownership is checked explicitly.
    IF NOT public.owns_establishment(est_id) THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    WITH valid AS (
        SELECT id, total_amount, created_at
        FROM public.orders
        WHERE establishment_id = est_id
          AND status <> 'cancelled'
    ),
    top_products AS (
        SELECT p.name, p.name_i18n, SUM(i.quantity)::int AS qty
        FROM public.order_items i
        JOIN valid v ON v.id = i.order_id
        JOIN public.products p ON p.id = i.product_id
        GROUP BY p.name, p.name_i18n
        ORDER BY SUM(i.quantity) DESC, p.name
        LIMIT 5
    ),
    -- Seven buckets ending with the caller's today.
    day_buckets AS (
        SELECT gs.bucket,
               COALESCE(SUM(v.total_amount), 0) AS value
        FROM generate_series(day_start - INTERVAL '6 days', day_start, INTERVAL '1 day') AS gs(bucket)
        LEFT JOIN valid v
               ON v.created_at >= gs.bucket
              AND v.created_at < gs.bucket + INTERVAL '1 day'
        GROUP BY gs.bucket
    )
    SELECT jsonb_build_object(
        'revenueToday', COALESCE((SELECT SUM(total_amount) FROM valid WHERE created_at >= day_start), 0),
        'ordersToday',  (SELECT COUNT(*) FROM valid WHERE created_at >= day_start),
        'totalRevenue', COALESCE((SELECT SUM(total_amount) FROM valid), 0),
        'orders',       (SELECT COUNT(*) FROM valid),
        'topProducts',  COALESCE((
            SELECT jsonb_agg(jsonb_build_object('name', name, 'nameI18n', name_i18n, 'qty', qty))
            FROM top_products
        ), '[]'::jsonb),
        'days', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', bucket, 'value', value) ORDER BY bucket)
            FROM day_buckets
        ), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- Managers only: the function reads across RLS, so it must not be reachable
-- by the anonymous customer role.
REVOKE ALL ON FUNCTION public.get_order_stats(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_stats(UUID, TIMESTAMPTZ) TO authenticated;

-- The floor and kitchen views now filter by status server-side instead of
-- fetching everything and discarding most of it in the browser.
CREATE INDEX IF NOT EXISTS idx_orders_establishment_status
    ON public.orders (establishment_id, status, created_at DESC);
