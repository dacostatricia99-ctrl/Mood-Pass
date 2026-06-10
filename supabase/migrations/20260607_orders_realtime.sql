-- Enable Supabase Realtime on orders so managers see new/updated orders live.
-- RLS still applies to realtime: a manager only receives changes for orders of
-- establishments they own.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;
