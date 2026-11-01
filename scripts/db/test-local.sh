#!/usr/bin/env bash
# Runs migrations + seed + pgTAP on a plain local Postgres (no Docker), e.g. in CI or cloud sessions.
# With Docker available prefer the official flow: `supabase db reset && supabase test db`.
# Requires PostGIS, pgTAP and pg_cron installed; pg_cron needs shared_preload_libraries and
# cron.database_name set to $DB_NAME.
set -euo pipefail
shopt -s nullglob

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_NAME="${DB_NAME:-rp_test}"
PGURL="${PGURL:-postgresql://postgres@localhost:54329}"
PSQL=(psql "$PGURL/$DB_NAME" -v ON_ERROR_STOP=1 -q -X)

psql "$PGURL/postgres" -q -X -c "drop database if exists $DB_NAME with (force)" -c "create database $DB_NAME"
"${PSQL[@]}" -f "$ROOT/scripts/db/supabase-shim.sql" >/dev/null
for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration" >/dev/null
done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
"${PSQL[@]}" -c "create extension if not exists pgtap with schema extensions" >/dev/null

failed=0
for test_file in "$ROOT"/supabase/tests/*.sql; do
  name="$(basename "$test_file")"
  if ! output="$(cd "$ROOT/supabase/tests" && "${PSQL[@]}" -tA -f "$test_file" 2>&1)"; then
    echo "✗ $name (errore SQL)"; echo "$output" | tail -5; failed=1; continue
  fi
  if echo "$output" | grep -qE '^not ok|# Looks like'; then
    echo "✗ $name"; echo "$output" | grep -E '^not ok|^#' | head -40; failed=1
  else
    echo "✓ $name ($(echo "$output" | grep -c '^ok') test)"
  fi
done
exit $failed
