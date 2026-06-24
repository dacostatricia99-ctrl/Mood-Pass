-- Manager-controlled highlights + establishment logo.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS logo_url TEXT;
