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
- Keep real secrets in ignored local environment files only. The example file contains non-secret placeholder values only.
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

### Integration database strategy (T2.3)

Unit tests (`npm test`) mock database calls. Integration tests use the separate
local database **`ushly_test`**, never development's `ushly`. Existing
`ushly_t22_test` and verification databases are not used or deleted.

With Node 22 and installed backend dependencies, start PostgreSQL and create the
test database once, from the repository root:

```bash
docker compose up -d postgres
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" ushly_test'
```

If it already exists, keep it; do not reset or recreate it. From `backend/`:

```bash
cp .env.test.example .env.test
```

Edit **`backend/.env.test`** privately: keep `NODE_ENV=test` and set
`TEST_DATABASE_URL` to the existing local PostgreSQL credentials, port, and exact
database name `ushly_test`. Use the URL format in the example, with URL-encoded
credentials and no query parameters or fragment. The file is Git-ignored.
Do not modify the development `.env` for testing. Then run from `backend/`:

```bash
npm run test:integration
npm run test:integration
npm test
npm run lint
npm run build
```

The integration command loads `.env.test` using Node's built-in environment-file
support. Exported shell variables take precedence: unset a stale `DATABASE_URL`,
`TEST_DATABASE_URL`, or non-test `NODE_ENV` in the shell if the guard rejects it.
It does not silently override unsafe values or fall back to the development URL.

Before spawning Prisma, the shared guard requires:

- `NODE_ENV` is exactly `test` and `TEST_DATABASE_URL` is explicitly present.
- The URL uses `postgres:` or `postgresql:`, host `127.0.0.1` or `localhost`,
  and exactly `/ushly_test` (not a name merely containing "test").
- Username/password are present, and there are no query parameters or fragments
  that could override the host, database options, or schema.
- An existing `DATABASE_URL`, if present, equals `TEST_DATABASE_URL` exactly.

The runner passes that validated URL to `prisma migrate deploy` before running
all `tests/*.integration.ts` files serially. It applies the versioned migrations;
it does not use a shadow database, reset, or `db push`. Migration failures stop
the suite with a safe message. Keep real credentials out of test fixtures/logs.

`cleanTestDatabase()` checks the guard on **every call**, then verifies the actual
connection's `current_database()` is `ushly_test` and `current_schema()` is
`public` inside the cleanup transaction. It deletes Click, RefreshToken, Link,
then User rows, preserving tables, constraints, indexes, and `_prisma_migrations`.
Every row in this dedicated database is considered disposable test data.
Tests clean before creating their own fixtures and clean afterward, including on
assertion failures. Fixed fixture values and repeated cleanup give each run the
same starting state. A killed process may leave rows; the next setup removes them.

Run only **one integration command at a time** against this database. Serial test
files prevent interference within a suite; separate concurrent processes would
need separate databases. The host/name guard prevents accidental misuse, not a
maliciously configured local proxy. CI will need an explicitly reviewed host
allowlist and preferably a test-only role when its environment is introduced.

The suite covers real Prisma read/write and lifecycle behavior, repeatable cleanup
of related and anonymous records, and preservation of migration history. Unit
safety tests reject development/production modes, missing/conflicting URLs,
non-test names, remote hosts, and connection-option overrides.


### Local user primitives (T3.1)

`src/utils/password.ts` provides asynchronous `hashPassword(password)` and
`verifyPassword(password, passwordHash)`. It uses pinned `argon2@0.45.1` with
Argon2id, 64 MiB memory, three iterations, parallelism one, and a 32-byte output.
The library generates a random salt and stores algorithm, parameters, salt, and
hash in the encoded string. Passwords are not trimmed, lowercased, or otherwise
normalized. Wrong passwords and malformed hashes return false; verification
errors fail closed. Hashing errors propagate rather than creating a user.
The native addon must be supported by the deployment platform; benchmark cost
and concurrency on deployment hardware before authentication endpoints go live.

`src/modules/auth/auth.repository.ts` exports only `createLocalUser(prisma,
{ email, password })` and `findUserByEmail(prisma, email)`. Pass `app.prisma`;
the repository never creates a client. Creation calls the separate password
utility before constructing Prisma data, so a raw password never reaches Prisma.
Returned User objects are internal persistence records and include passwordHash;
future HTTP code must explicitly select safe response fields.

Both writes and lookups use **`email.trim().toLowerCase()`** across the entire
address. Dots and `+` suffixes remain intact. This is the product's case-insensitive
identity rule, including the local part; provider-specific alias folding is not
performed. Existing differently cased records are not rewritten in this task.
Future import/OAuth writers must apply the same rule. Input syntax and password
policy validation belong at the future registration boundary.

PostgreSQL's existing unique email constraint prevents duplicate normalized
addresses, including racing requests. There is no pre-insert existence check.
Prisma P2002 is translated to a generic `user_creation_failed` AppError (409),
without including the email, constraint details, or a raw Prisma error as cause.
Other database failures propagate to the existing error handling. This primitive
alone is not an account-enumeration defense: T3.2 must decide consistent public
registration responses and timing, rather than exposing this conflict outcome
as an email-availability check.

Tests run with the existing `npm test` and `npm run test:integration` commands.
They cover exact-password verification (including whitespace/Unicode), fresh
salts, wrong passwords, malformed hashes, normalized create/find, missing users,
duplicate and concurrent creation, and persisted hashes instead of raw passwords.
Integration fixtures and cleanup remain restricted to `ushly_test`.
