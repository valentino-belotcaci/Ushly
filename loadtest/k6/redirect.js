import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const HIT_CODE = __ENV.HIT_CODE || 'loadhit0001';
const MISS_PREFIX = __ENV.MISS_PREFIX || 'loadmiss';
const MISS_COUNT = Number(__ENV.MISS_COUNT || 10000);

if (!/^[A-Za-z0-9]+$/.test(HIT_CODE) || !/^[A-Za-z0-9]+$/.test(MISS_PREFIX)) {
  throw new Error('HIT_CODE and MISS_PREFIX must contain only ASCII letters and digits.');
}

const hitErrors = new Rate('cache_hit_errors');
const missErrors = new Rate('cache_miss_errors');
const notFoundErrors = new Rate('not_found_errors');
const hitRequests = new Counter('cache_hit_requests');
const missRequests = new Counter('cache_miss_requests');
const notFoundRequests = new Counter('not_found_requests');
const hitLatency = new Trend('cache_hit_latency', true);
const missLatency = new Trend('cache_miss_latency', true);
const notFoundLatency = new Trend('not_found_latency', true);

export const options = {
  scenarios: {
    cache_hit: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.HIT_RATE || 20),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: Number(__ENV.HIT_VUS || 10),
      exec: 'cacheHit',
    },
    cache_miss: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.MISS_RATE || 20),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: Number(__ENV.MISS_VUS || 10),
      exec: 'cacheMiss',
      startTime: '2s',
    },
    not_found: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.NOT_FOUND_RATE || 10),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: Number(__ENV.NOT_FOUND_VUS || 5),
      exec: 'notFound',
      startTime: '4s',
    },
  },
  thresholds: {
    cache_hit_errors: ['rate<0.01'],
    cache_miss_errors: ['rate<0.01'],
    not_found_errors: ['rate<0.01'],
  },
};

function requestRedirect(path, expectedStatus, metrics) {
  const started = Date.now();
  const response = http.get(`${BASE_URL}/${path}`, { redirects: 0 });
  metrics.latency.add(Date.now() - started);
  metrics.requests.add(1);
  const ok = check(response, { [`status is ${expectedStatus}`]: (res) => res.status === expectedStatus });
  metrics.errors.add(!ok);
}

export function cacheHit() {
  requestRedirect(HIT_CODE, 307, { errors: hitErrors, requests: hitRequests, latency: hitLatency });
}

export function cacheMiss() {
  const index = ((__VU - 1) * 100000 + __ITER) % MISS_COUNT;
  requestRedirect(`${MISS_PREFIX}${String(index).padStart(5, '0')}`, 307, {
    errors: missErrors,
    requests: missRequests,
    latency: missLatency,
  });
}

export function notFound() {
  requestRedirect(`loadnotfound${__VU}${__ITER}`, 404, {
    errors: notFoundErrors,
    requests: notFoundRequests,
    latency: notFoundLatency,
  });
}
