# Ushly

## Baseline setup

This repository is configured for a Node 22 + TypeScript backend and a Dockerized PostgreSQL/Redis local stack.

### Verified working commands

From the repository root:

```bash
docker compose up -d
docker compose ps
```

From the backend folder:

```bash
npm install
npm run build
npm run lint
npm test
npm run dev
```

### Local infrastructure (PostgreSQL + Redis)

Use Docker Compose from the repository root to start the local data services:

```bash
docker compose up -d
```

Check that both services are healthy:

```bash
docker compose ps
```

View logs for either service:

```bash
docker compose logs -f postgres
docker compose logs -f redis
```

Stop and remove the containers:

```bash
docker compose down
```

Stop without removing volume data:

```bash
docker compose stop
```

### Notes

- The backend uses strict TypeScript mode and the existing lint/build pipeline is currently passing.
- Keep real secrets in the ignored root `.env` file only. The example file contains non-secret placeholder values only.
- PostgreSQL runs on version 16 and Redis runs on version 7.
- Named volumes preserve data between restarts and health checks ensure services are ready before use.
- Keep local infrastructure changes minimal and consistent with the project roadmap; do not add production dependencies without approval.

### API error format

The backend uses a consistent JSON response shape for safe client/server errors:

```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "details": [
    { "field": "body/email", "message": "must match format \"email\"" }
  ]
}
```

For known application errors, the `error` value is the domain-specific code and the HTTP status matches the declared app error status. Unexpected failures return a generic `internal_server_error` response with no internal details or stack traces.

### Prisma lifecycle and readiness (T2.2)

The Prisma plugin owns one client per Fastify application (one application per
server process). It registers before other plugins/routes, exposes the typed
`app.prisma` decoration, runs a minimal `SELECT 1` check in `onReady`, and calls
`$disconnect()` in `onClose`. The existing signal handler already calls
`app.close()`. There is no separate global client. `fastify-plugin` exposes the
root decoration to subsequent plugins; TypeScript module augmentation tells the
compiler about that runtime property.

- `GET /health/live` reports that the HTTP application is running. It does not
  query PostgreSQL or Redis.
- `GET /health/ready` queries PostgreSQL and returns `200 {"ok":true}` on success.
  A failure or timeout returns `503` with `error: "service_unavailable"`,
  `message: "Database is unavailable"`, and `details: null`, through the existing
  global error handler. The original Prisma error is neither returned nor logged.
- `DATABASE_READY_TIMEOUT_MS` defaults to 1000 and accepts integers from 1 to
  5000. It bounds startup checking and readiness responses. Startup failure is
  logged safely and leaves HTTP available so liveness works and later readiness
  probes can detect recovery. Fastify's `ready()` therefore means plugin boot
  completed, not that PostgreSQL is currently reachable.

The deadline does not cancel an underlying Prisma query. Concurrent probes share
one pending query until it settles, including after timeout; subsequent probes
then retry. For production, configure and verify Prisma connection/pool timeouts
and database statement timeouts against deployment requirements. Shutdown awaits
Prisma disconnection; the readiness deadline is not a shutdown deadline. A
successful connectivity probe does not verify migrations or every application
query. Redis readiness belongs to its later lifecycle task. Existing HTTP rate
limits remain in force; choose a deployment probe frequency within those limits.

From `backend/`:

```bash
npm test
npm run lint
npm run build
```

The unit suite mocks Prisma queries and needs no database. The focused integration
test requires a migrated, dedicated **local `ushly_t22_test`** database. It refuses
missing configuration, other database names, remote hosts, and production mode;
it never falls back to the application's `DATABASE_URL`. Create that database
once, then set `TEST_DATABASE_URL` privately in your shell to its connection URL:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:integration
```

The integration test verifies a startup query, decoration inheritance, readiness,
a user insert/read, and real disconnection via `app.close()`. It removes only its
randomly named test user in a `finally` block and does not reset the database.
Error, timeout, recovery, and safe logging behavior use mocked queries so testing
does not require stopping shared PostgreSQL or manipulating networks. The full
reusable test-database setup remains T2.3 work.
