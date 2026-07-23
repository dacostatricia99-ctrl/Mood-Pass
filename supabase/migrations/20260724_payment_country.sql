-- PawaPay needs the country when a fixed amount is charged (it scopes the
-- payment page to that country's mobile-money providers and sets the real
-- currency: XOF for West Africa, XAF for Central Africa — both called "FCFA").
ALTER TABLE public.payment_configs
    ADD COLUMN IF NOT EXISTS country TEXT;
