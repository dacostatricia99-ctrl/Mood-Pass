# Database tests

SQL-level tests for the invariants the migrations enforce. They matter because
those invariants *are* the security boundary: the anon key ships inside the JS
bundle, so anything the database does not enforce, a customer can rewrite.

```sh
npm run test:db                 # boots a throwaway cluster, runs everything
DATABASE_URL=postgres://…/scratch npm run test:db
```

The runner replays every file in `supabase/migrations/` in order, then executes
each `*.sql` file in this directory. It exits non-zero on the first failed
assertion.

`DATABASE_URL` must point at a **throwaway** database — migrations and fixtures
are applied straight into it and are not cleaned up. With no `DATABASE_URL`,
the runner creates its own cluster and removes it on exit, which needs the
PostgreSQL *server* binaries (`initdb`, `pg_ctl`), not just `psql`.

## Layout

- `fixtures/00_supabase_stubs.sql` — test-only stand-ins for what Supabase
  manages in a real project (`auth.users`, `auth.uid()`, the `anon` /
  `authenticated` roles, the storage schema). Never applied to production.
- `order_pricing_integrity.sql` — covers `20260825_order_pricing_integrity.sql`:
  forged prices and totals are overridden, a line must reference an orderable
  product of the same establishment, and the basket freezes once a payment is
  armed.

Test statements run under `SET ROLE anon`, which is what the customer's browser
actually holds, so RLS and the triggers are exercised the same way they are in
production rather than as a privileged user.
