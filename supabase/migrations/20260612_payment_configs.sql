-- Per-establishment payment provider credentials (Model A).
--
-- Each restaurant connects its OWN provider account (CinetPay), so funds go
-- directly to it. The secret api_key must never be readable by the public:
-- RLS restricts the whole row to the establishment owner. The payment edge
-- functions read it server-side with the service role.

CREATE TABLE IF NOT EXISTS public.payment_configs (
    establishment_id UUID PRIMARY KEY REFERENCES public.establishments(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'cinetpay',
    site_id TEXT,
    api_key TEXT,
    sandbox BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

-- Only the owning establishment's manager can read/write its config. Anonymous
-- customers get no access at all (no policy = denied) — the secret never leaks.
CREATE POLICY "Owners manage their payment config"
ON public.payment_configs FOR ALL TO authenticated
USING (public.owns_establishment(establishment_id))
WITH CHECK (public.owns_establishment(establishment_id));
