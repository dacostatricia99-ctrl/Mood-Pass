#!/usr/bin/env bash
#
# Replays every migration on a throwaway PostgreSQL database, then runs the SQL
# test files in this directory against it.
#
#   supabase/tests/run.sh
#   DATABASE_URL=postgres://.../some_scratch_db supabase/tests/run.sh
#
# With no DATABASE_URL the script boots its own temporary cluster and tears it
# down on exit, so it needs the PostgreSQL server binaries (initdb, pg_ctl) —
# the client alone is not enough.
#
# DATABASE_URL must point at a THROWAWAY database: the script applies the
# migrations and test fixtures straight into it and does not clean up after.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TESTS="$ROOT/supabase/tests"

command -v psql >/dev/null || { echo "psql not found in PATH" >&2; exit 1; }

TMPDIR_CLUSTER=""
cleanup() {
    if [ -n "$TMPDIR_CLUSTER" ]; then
        run_pg "pg_ctl -D '$TMPDIR_CLUSTER/data' stop -m immediate" >/dev/null 2>&1 || true
        rm -rf "$TMPDIR_CLUSTER"
    fi
}
trap cleanup EXIT

# Postgres refuses to run as root, so drop to the postgres account when needed.
run_pg() {
    if [ "$(id -u)" -eq 0 ]; then
        su postgres -c "PATH=$PGBIN:\$PATH $1"
    else
        env PATH="$PGBIN:$PATH" bash -c "$1"
    fi
}

if [ -z "${DATABASE_URL:-}" ]; then
    PGBIN="$(pg_config --bindir 2>/dev/null || true)"
    if [ ! -x "${PGBIN:-}/initdb" ]; then
        PGBIN="$(dirname "$(ls -1 /usr/lib/postgresql/*/bin/initdb 2>/dev/null | sort -V | tail -1)")"
    fi
    [ -x "${PGBIN:-}/initdb" ] || {
        echo "PostgreSQL server binaries not found. Install them, or pass DATABASE_URL." >&2
        exit 1
    }

    TMPDIR_CLUSTER="$(mktemp -d)"
    chmod 755 "$TMPDIR_CLUSTER"
    mkdir -p "$TMPDIR_CLUSTER/data" "$TMPDIR_CLUSTER/sock"
    [ "$(id -u)" -eq 0 ] && chown -R postgres:postgres "$TMPDIR_CLUSTER"

    PORT=55432
    echo "Starting a temporary PostgreSQL cluster..."
    run_pg "initdb -U postgres -A trust -D '$TMPDIR_CLUSTER/data'" >/dev/null
    run_pg "pg_ctl -D '$TMPDIR_CLUSTER/data' -o '-p $PORT -k $TMPDIR_CLUSTER/sock -c listen_addresses=' -l '$TMPDIR_CLUSTER/data/log' start" >/dev/null

    for _ in $(seq 1 30); do
        psql -h "$TMPDIR_CLUSTER/sock" -p "$PORT" -U postgres -d postgres -c 'SELECT 1' >/dev/null 2>&1 && break
        sleep 0.5
    done

    export PGHOST="$TMPDIR_CLUSTER/sock" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres
    psql -v ON_ERROR_STOP=1 -q \
        -c 'DROP DATABASE IF EXISTS moodpass_test' \
        -c 'CREATE DATABASE moodpass_test' >/dev/null
    export PGDATABASE=moodpass_test
    PSQL=(psql -v ON_ERROR_STOP=1 -q)
else
    # Applied straight into the database the caller pointed us at.
    PSQL=(psql -v ON_ERROR_STOP=1 -q "$DATABASE_URL")
fi

echo "Applying Supabase stubs..."
"${PSQL[@]}" -f "$TESTS/fixtures/00_supabase_stubs.sql" >/dev/null

echo "Applying migrations..."
for f in "$MIGRATIONS"/*.sql; do
    "${PSQL[@]}" -f "$f" >/dev/null
done

status=0
for f in "$TESTS"/*.sql; do
    echo ""
    echo "=== $(basename "$f") ==="
    "${PSQL[@]}" -f "$f" || status=1
done

echo ""
[ $status -eq 0 ] && echo "PASS" || echo "FAIL"
exit $status
