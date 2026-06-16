-- Mood Pass SaaS subscriptions (restaurant -> Mood Pass, the platform fee).
--
-- This is a SEPARATE money flow from customer orders (which go straight to the
-- restaurant, Model A). Each establishment gets a free trial, then must keep an
-- active subscription to use the manager features. Access is gated client-side
-- by comparing current_period_end to now(); the row is extended server-side by
-- the subscription payment edge function (service role).

CREATE TABLE IF NOT EXISTS public.subscriptions (
    establishment_id UUID PRIMARY KEY REFERENCES public.establishments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired')),
    plan TEXT NOT NULL DEFAULT 'monthly',
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners can read their own subscription. Writes happen via triggers and the
-- service role (payment functions) only — never directly by a user.
CREATE POLICY "Owners read their subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.owns_establishment(establishment_id));

-- Every new establishment starts a 14-day trial automatically.
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.subscriptions (establishment_id, status, current_period_end)
    VALUES (NEW.id, 'trial', NOW() + INTERVAL '14 days')
    ON CONFLICT (establishment_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_subscription ON public.establishments;
CREATE TRIGGER trg_create_subscription
AFTER INSERT ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Backfill existing establishments so nothing is locked out retroactively.
INSERT INTO public.subscriptions (establishment_id, status, current_period_end)
SELECT id, 'active', NOW() + INTERVAL '60 days' FROM public.establishments
ON CONFLICT (establishment_id) DO NOTHING;
