-- Stand-ins for the pieces Supabase manages for us, so the migrations can be
-- replayed on a plain PostgreSQL instance without the full Supabase stack.
--
-- These are TEST-ONLY. They are never applied to a real project: production
-- gets the real auth/storage schemas from Supabase itself.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles are cluster-wide, so this file stays re-runnable across databases.
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);

-- Supabase resolves this from the request JWT; here it comes from a GUC so a
-- test can switch identities with set_config('request.jwt.claim.sub', ...).
CREATE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN);
CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), bucket_id TEXT);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE PUBLICATION supabase_realtime;

-- Supabase grants broadly and leans on RLS for authorization; mirror that so
-- the tests exercise the policies rather than plain table privileges.
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
