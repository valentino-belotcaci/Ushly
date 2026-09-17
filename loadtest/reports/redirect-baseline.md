# Redirect baseline report

Status: **completed successfully**

The scenario checks passed 100%: 1,502/1,502 checks passed and 0 failed. k6's
global `http_req_failed` metric was 20.03% because it treats the expected 404
not-found responses as failed HTTP requests. The custom scenario error rates
below use the scenario's expected status and are therefore the relevant error
measurements for this run.

## Run metadata

- Date/time and timezone: 2026-09-17 03:22:53–03:23:27 +02:00 (scenario points)
- Git revision: not recorded in the generated result files
- Backend command: not recorded in the generated result files
- k6 version: not recorded in the generated result files
- Node version: not recorded in the generated result files
- Host/OS/CPU/memory: host identity was not recorded; container resource samples used a 15.37 GiB host memory limit
- Backend process count: 1, as specified by the load-test setup; process CPU/memory were not sampled
- Test duration and rates: 30s per scenario; cache hit 20/s, cache miss 20/s, not found 10/s; scenarios started at 0s, 2s, and 4s
- Application rate limit: `LOAD_TEST_MODE=true`, `LOAD_TEST_RATE_LIMIT_MAX=100000`

## Environment and dataset

- PostgreSQL image/version/configuration: `postgres:16` from the repository Docker Compose configuration; runtime tuning was not recorded
- Redis image/version/configuration: `redis:7` from the repository Docker Compose configuration; runtime tuning was not recorded
- Database connection target: local PostgreSQL used by the backend; credentials intentionally omitted and the exact target was not recorded in result files
- Seeded cache-hit links: `1`
- Seeded cache-miss links: 10,000, using the documented default `MISS_COUNT`; 601 were exercised in this run
- Not-found key pattern: `loadnotfound<vu><iteration>`
- Cache TTL/version: `v1`, maximum `300s`

## Results

| Scenario | Requests | Throughput | Error rate | p50 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cache hit | 600 | 20.035 req/s | 0.00% | 2 ms | 5 ms | 7 ms |
| Cache miss | 601 | 20.027 req/s | 0.00% | 2 ms | 12 ms | 14 ms |
| Not found | 301 | 10.034 req/s | 0.00% | 4 ms | 9 ms | 11 ms |

Latency values are the custom scenario trends in milliseconds, calculated from
the raw k6 points. Throughput is requests divided by each scenario's observed
active point span. Overall k6 totals were 1,502 requests at 44.170 req/s and a
global `http_req_failed` value of 20.03%.

Resource observations from `loadtest/results/resources.csv`:

- PostgreSQL CPU/memory: 0.00–7.43% CPU, average 1.86%; 61.63–68.11 MiB / 15.37 GiB
- Redis CPU/memory: 0.62–4.47% CPU, average 1.54%; 5.375–5.633 MiB / 15.37 GiB
- PostgreSQL connections: 2–3, average 2.89 across 9 samples
- Backend CPU/memory: `not collected by the default sampler`

## Interpretation

- Bottleneck hypothesis: no bottleneck is established by this baseline; the not-found path had the highest measured p95/p99 latency
- Evidence supporting it: not-found p95/p99 were 9/11 ms versus 5/7 ms for cache hits and 12/14 ms for cache misses; application CPU/memory and database query timing were not measured
- Next measurement or change: repeat with backend process CPU/memory and database query/connection-pool telemetry before optimizing

## Limitations

This is a local single-host baseline using container-level resource samples and
one backend process. It does not establish production capacity, multi-instance
behavior, network behavior, or a service-level objective. The host identity,
Node/k6 versions, Git revision, backend CPU/memory, and database query timing
were not recorded by the run artifacts. No optimization was made as part of
T5.3.
