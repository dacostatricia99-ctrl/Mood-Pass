-- Web Push subscriptions, one per customer order, so we can notify the customer
-- when their order is ready (even with the app closed).
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- The anonymous customer registers their own device for their order.
CREATE POLICY "Anyone can register a push subscription"
ON public.push_subscriptions FOR INSERT WITH CHECK (true);
-- Reads/sends are done server-side with the service role only.
