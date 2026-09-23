#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the database containing the deterministic fixtures}"
: "${LOAD_TEST_DATABASE_NAME:=ushly_loadtest}"

execute=false
if [[ "${1:-}" == '--execute' ]]; then
  execute=true
elif [[ -n "${1:-}" ]]; then
  echo 'Usage: cleanup-redirect-data.sh [--execute]' >&2
  exit 2
fi

actual_database="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()')"
if [[ "$actual_database" != "$LOAD_TEST_DATABASE_NAME" && "${ALLOW_NON_LOADTEST_DATABASE:-no}" != 'yes' ]]; then
  echo "Refusing cleanup: connected to '${actual_database}', expected '${LOAD_TEST_DATABASE_NAME}'." >&2
  echo 'For reviewed legacy cleanup only, set ALLOW_NON_LOADTEST_DATABASE=yes.' >&2
  exit 1
fi

echo "Database: ${actual_database}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -P pager=off <<'SQL'
SELECT l.id,
       l."shortCode",
       l."destinationUrl",
       l."userId",
       l.status,
       l."expiresAt",
       l."createdAt",
       COUNT(c.id) AS "dependentClickRows"
FROM "Link" l
LEFT JOIN "Click" c ON c."linkId" = l.id
WHERE l."shortCode" = 'loadhit0001'
   OR l."shortCode" LIKE 'loadmiss%'
GROUP BY l.id
ORDER BY l."shortCode";
SQL

if [[ "$execute" != true ]]; then
  echo 'Dry run only. No rows were deleted.'
  echo 'After reviewing the rows, rerun with --execute and the required confirmation phrase.'
  exit 0
fi

if [[ "${CONFIRM_LOAD_FIXTURE_CLEANUP:-}" != 'delete-loadhit0001-and-loadmiss' ]]; then
  echo 'Refusing deletion: set CONFIRM_LOAD_FIXTURE_CLEANUP=delete-loadhit0001-and-loadmiss.' >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('ushly-load-fixture-cleanup'));

WITH matching AS (
  SELECT id
  FROM "Link"
  WHERE "shortCode" = 'loadhit0001'
     OR "shortCode" LIKE 'loadmiss%'
), deleted AS (
  DELETE FROM "Link"
  WHERE id IN (SELECT id FROM matching)
  RETURNING id
)
SELECT COUNT(*) AS "deletedLinkRows" FROM deleted;

COMMIT;
SQL

echo 'Cleanup complete. Only loadhit0001 and loadmiss% link fixtures were selected; dependent clicks cascade by schema.'
