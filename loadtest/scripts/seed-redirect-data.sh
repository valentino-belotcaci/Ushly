#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the load-test database}"
: "${MISS_COUNT:=10000}"
: "${HIT_CODE:=loadhit0001}"
: "${MISS_PREFIX:=loadmiss}"

[[ "$HIT_CODE" =~ ^[A-Za-z0-9]+$ ]] || {
  echo 'HIT_CODE must contain only ASCII letters and digits.' >&2
  exit 1
}
[[ "$MISS_PREFIX" =~ ^[A-Za-z0-9]+$ ]] || {
  echo 'MISS_PREFIX must contain only ASCII letters and digits.' >&2
  exit 1
}

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v hit_code="$HIT_CODE" \
  -v miss_count="$MISS_COUNT" \
  -v miss_prefix="$MISS_PREFIX" <<'SQL'
BEGIN;
DELETE FROM "Link"
WHERE id = 'load-test-hit'
   OR id LIKE 'load-test-miss-%'
   OR "shortCode" = :'hit_code'
   OR "shortCode" LIKE :'miss_prefix' || '%';

INSERT INTO "Link" (id, "shortCode", "destinationUrl", status, "createdAt", "updatedAt")
VALUES ('load-test-hit', :'hit_code', 'https://example.com/load-test-hit', 'active', now(), now());

INSERT INTO "Link" (id, "shortCode", "destinationUrl", status, "createdAt", "updatedAt")
SELECT 'load-test-miss-' || n,
       :'miss_prefix' || lpad(n::text, 5, '0'),
       'https://example.com/load-test-miss-' || n,
       'active', now(), now()
FROM generate_series(0, (:'miss_count')::integer - 1) AS numbers(n);
COMMIT;
SQL

echo "Seeded ${MISS_COUNT} cache-miss links and ${HIT_CODE}."
