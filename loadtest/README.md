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

The baseline assumes:

- Node 22 backend running at `http://127.0.0.1:3000`.
- PostgreSQL 16 and Redis 7 from the repository's Docker Compose file.
- `DATABASE_URL` points to the same database used by the running backend.
- `psql`, Docker Compose, curl, and k6 are installed separately.
- The machine is otherwise idle and the backend is run as a single process.
- The benchmark backend is started with `LOAD_TEST_MODE=true` and
  `LOAD_TEST_RATE_LIMIT_MAX=100000`; this is an explicit local-only override.

No application, Redis, or PostgreSQL configuration is changed by these scripts.
The seed script deletes and recreates only rows whose short codes use the
load-test prefixes.

## Reproducible command sequence

From the repository root:

```bash
docker compose up -d
docker compose ps
cd backend
npm run build
NODE_ENV=development LOAD_TEST_MODE=true LOAD_TEST_RATE_LIMIT_MAX=100000 npm run start
```

In another terminal, from the repository root:

```bash
export DATABASE_URL='postgresql://ushly:change_me@127.0.0.1:5432/ushly'
export BASE_URL='http://127.0.0.1:3000'
export DURATION='30s'
export DURATION_SECONDS=40
bash loadtest/scripts/run-redirect-baseline.sh
```

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
