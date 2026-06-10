-- Multilingual support for menus (MoodPass)
--
-- Strategy: keep the existing `name` / `description` TEXT columns as the
-- canonical value (written in the menu's original language). Add JSONB columns
-- holding per-language overrides in the shape:
--     { "fr": "...", "en": "...", "ar": "...", "pt": "...", "zh": "..." }
-- The frontend reads name_i18n[lang] and falls back to `name` when a language
-- is missing, so a partially translated menu still renders correctly.

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN indexes so menus can be filtered/searched by a localized value cheaply.
CREATE INDEX IF NOT EXISTS idx_products_name_i18n ON public.products USING GIN (name_i18n);
CREATE INDEX IF NOT EXISTS idx_categories_name_i18n ON public.categories USING GIN (name_i18n);

-- Helper: resolve a localized text with fallback, usable from SQL/views if needed.
--   i18n_text(name_i18n, 'en', name) -> name_i18n->>'en' when present, else name.
CREATE OR REPLACE FUNCTION public.i18n_text(translations JSONB, lang TEXT, fallback TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(NULLIF(translations->>lang, ''), fallback);
$$;
