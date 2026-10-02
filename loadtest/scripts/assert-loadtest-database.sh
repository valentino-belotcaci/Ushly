#!/usr/bin/env bash

: "${DATABASE_URL:?Set DATABASE_URL to the dedicated load-test database}"
: "${LOAD_TEST_DATABASE_NAME:=ushly_loadtest}"

actual_database="$({
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()'
} 2>/dev/null)" || {
  echo 'Could not verify the load-test database connection.' >&2
  return 1
}

if [[ "$actual_database" != "$LOAD_TEST_DATABASE_NAME" ]]; then
  echo "Refusing load-test mutation: connected to '${actual_database}', expected '${LOAD_TEST_DATABASE_NAME}'." >&2
  echo 'Use the dedicated load-test database. Cleanup of legacy fixtures elsewhere additionally requires ALLOW_NON_LOADTEST_DATABASE=yes.' >&2
  return 1
fi
