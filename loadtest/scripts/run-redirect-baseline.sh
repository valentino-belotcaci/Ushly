#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:=http://127.0.0.1:3001}"
: "${DATABASE_URL:?Set DATABASE_URL to the load-test database}"
: "${DURATION:=30s}"
: "${DURATION_SECONDS:=40}"
: "${RESULT_DIR:=loadtest/results}"

command -v k6 >/dev/null || { echo 'k6 is required; install it separately from the application dependencies.' >&2; exit 1; }
command -v curl >/dev/null || { echo 'curl is required.' >&2; exit 1; }
command -v psql >/dev/null || { echo 'psql is required.' >&2; exit 1; }
curl --fail --silent "${BASE_URL}/health/ready" >/dev/null || {
  echo "Backend readiness failed at ${BASE_URL}; refusing to run measurements." >&2
  exit 1
}

mkdir -p "$RESULT_DIR"
"$(dirname "$0")/seed-redirect-data.sh"

"$(dirname "$0")/collect-resources.sh" \
  >"$RESULT_DIR/resource-sampler.log" 2>&1 &
sampler_pid=$!
trap 'kill "$sampler_pid" 2>/dev/null || true' EXIT

k6 run \
  --out "json=$RESULT_DIR/k6.json" \
  --summary-export "$RESULT_DIR/k6-summary.json" \
  -e BASE_URL="$BASE_URL" \
  -e DURATION="$DURATION" \
  loadtest/k6/redirect.js

wait "$sampler_pid" || true
echo "Results written to ${RESULT_DIR}. Complete loadtest/reports/redirect-baseline.md with the measured values."
