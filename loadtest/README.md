# Redirect load test

This setup measures T5.3 without changing application code or adding a
production dependency. It uses the separately installed k6 CLI. The test has
three independent scenarios:

- `cache_hit`: repeatedly requests one warmed redirect.
- `cache_miss`: requests existing active links seeded in PostgreSQL; each link
  is initially absent from Redis.
- `not_found`: requests valid-format short codes absent from PostgreSQL.

All generated short codes are alphanumeric because the production redirect
route accepts only `^[A-Za-z0-9]+$`. The default hit code is `loadhit0001`, the
miss prefix is `loadmiss`, and not-found codes use `loadnotfound<vu><iteration>`.

The k6 summary provides request throughput, error rate, and latency percentiles.
The companion sampler records PostgreSQL and Redis Docker CPU/memory usage and
PostgreSQL connection count once per second. k6 and the sampler run only after
`GET /health/ready` succeeds.

## Environment

The baseline requires an isolated local environment:

- Node 22 backend running at `http://127.0.0.1:3001` with
  `loadtest/.env`, copied from `loadtest/.env.example`.
- PostgreSQL 16 in the Compose `postgres-loadtest` service on port 5433.
- `DATABASE_URL` points to the dedicated `ushly_loadtest` database used by
  both the seed script and benchmark backend. Mutation scripts verify the
  connected database name before changing rows.
- Redis database 1 is used by the example configuration to keep benchmark
  cache keys separate from ordinary development keys.
- `psql`, Docker Compose, curl, and k6 are installed separately.
- The machine is otherwise idle and the backend is run as a single process.
- The benchmark backend is started with `LOAD_TEST_MODE=true` and
  `LOAD_TEST_RATE_LIMIT_MAX=100000`; this is an explicit local-only override.

The seed script deletes and recreates only rows whose IDs or short codes use
the configured load-test prefixes, and refuses to run outside
`ushly_loadtest`.

## Reproducible command sequence

From the repository root:

```bash
cp loadtest/.env.example loadtest/.env
docker compose --profile loadtest up -d postgres-loadtest redis
set -a
source loadtest/.env
set +a
cd backend
npx prisma migrate deploy
cd ..
docker compose --profile loadtest ps
cd backend
npm run build
node --env-file=../loadtest/.env dist/server.js
```

In another terminal, from the repository root:

```bash
set -a
source loadtest/.env
set +a
export BASE_URL='http://127.0.0.1:3001'
export DURATION='30s'
export DURATION_SECONDS=40
bash loadtest/scripts/run-redirect-baseline.sh
```

## Fixture inspection and cleanup

Cleanup is dry-run by default and selects only `loadhit0001` and short codes
beginning with `loadmiss`. It prints every matching link and its dependent
click count without changing data:

```bash
bash loadtest/scripts/cleanup-redirect-data.sh
```

After reviewing that output, deletion additionally requires both `--execute`
and an exact confirmation phrase:

```bash
CONFIRM_LOAD_FIXTURE_CLEANUP=delete-loadhit0001-and-loadmiss \
  bash loadtest/scripts/cleanup-redirect-data.sh --execute
```

The schema cascades dependent click rows when a selected link is deleted. For
legacy fixtures in a database other than `ushly_loadtest`, the command also
requires `ALLOW_NON_LOADTEST_DATABASE=yes`; use that override only after a
separate review of the printed rows.

The default load is 20 hit requests/second, 20 miss requests/second, and 10
not-found requests/second. Override `HIT_RATE`, `MISS_RATE`,
`NOT_FOUND_RATE`, `MISS_COUNT`, and `DURATION` for another explicitly recorded
run. Do not compare runs made with different values as if they were identical.

## Measurements and limitations

The report must include k6 request count, throughput, error rate, p50, p95, and
p99 latency for each scenario, plus CPU, memory, and PostgreSQL connection
observations from `resources.csv`. Docker statistics are container-level
measurements; backend CPU and memory are not included unless the operator adds
a separate process sampler. PostgreSQL connection count is sampled, not a
complete pool history. Results are local single-host observations and do not
support production capacity claims.

The script treats expected `307` responses for valid links and expected `404`
responses for not-found links as successful scenario requests. A request with
an unexpected status contributes to `redirect_errors` and causes the k6
threshold to fail at 1% errors.
