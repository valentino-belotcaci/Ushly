#!/usr/bin/env bash
set -euo pipefail

: "${DURATION_SECONDS:=40}"
: "${OUTPUT_FILE:=loadtest/results/resources.csv}"
: "${POSTGRES_CONTAINER:=}"
: "${REDIS_CONTAINER:=}"

mkdir -p "$(dirname "$OUTPUT_FILE")"
printf 'timestamp,postgres_cpu,postgres_memory,redis_cpu,redis_memory,postgres_connections\n' > "$OUTPUT_FILE"

if [[ -z "$POSTGRES_CONTAINER" ]]; then
  POSTGRES_CONTAINER="$(docker compose --profile loadtest ps -q postgres-loadtest)"
fi
if [[ -z "$REDIS_CONTAINER" ]]; then
  REDIS_CONTAINER="$(docker compose ps -q redis)"
fi

end=$((SECONDS + DURATION_SECONDS))
while (( SECONDS < end )); do
  postgres_stats="$(docker stats --no-stream --format '{{.CPUPerc}},{{.MemUsage}}' "$POSTGRES_CONTAINER" 2>/dev/null || echo 'unavailable,unavailable')"
  redis_stats="$(docker stats --no-stream --format '{{.CPUPerc}},{{.MemUsage}}' "$REDIS_CONTAINER" 2>/dev/null || echo 'unavailable,unavailable')"
  connections="$(psql "$DATABASE_URL" -Atc "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();" 2>/dev/null || echo unavailable)"
  printf '%s,%s,%s,%s,%s,%s\n' "$(date --iso-8601=seconds)" \
    "${postgres_stats%%,*}" "${postgres_stats#*,}" \
    "${redis_stats%%,*}" "${redis_stats#*,}" "$connections" >> "$OUTPUT_FILE"
  sleep 1
done
