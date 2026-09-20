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

The Prisma and Redis plugins each own one client per Fastify application (one
application per server process). They register before routes, expose typed
`app.prisma` and `app.redis` decorations, run connectivity checks in `onReady`,
and close their clients in `onClose`. The existing signal handler already calls
`app.close()`. There are no separate global clients. `fastify-plugin` exposes
the root decorations to subsequent plugins; TypeScript module augmentation tells
the compiler about those runtime properties.

- `GET /health/live` reports that the HTTP application is running. It does not
  query PostgreSQL or Redis.
- `GET /health/ready` queries PostgreSQL and Redis and returns `200 {"ok":true}`
  only when both are reachable. A database failure returns `503` with
  `message: "Database is unavailable"`; a Redis failure returns `503` with
  `message: "Redis is unavailable"`. Both use `error: "service_unavailable"`
  and `details: null`; original driver errors are neither returned nor logged.
- `DATABASE_READY_TIMEOUT_MS` defaults to 1000 and accepts integers from 1 to
  5000. It bounds startup checking and readiness responses. Startup failure is
  logged safely and leaves HTTP available so liveness works and later readiness
  probes can detect recovery. Fastify's `ready()` therefore means plugin boot
  completed, not that PostgreSQL is currently reachable.

The deadline does not cancel an underlying Prisma query. Concurrent probes share
one pending query until it settles, including after timeout; subsequent probes
then retry. Redis uses a bounded exponential reconnect strategy; after the
configured attempts it stops reconnecting until the process is restarted or the
client is explicitly managed by a later task. Redis startup failure leaves HTTP
available, while readiness remains unavailable. `REDIS_CONNECT_TIMEOUT_MS`
defaults to 1000 (1–5000), `REDIS_MAX_RECONNECT_ATTEMPTS` defaults to 5 (0–10),
and `REDIS_RECONNECT_BASE_DELAY_MS` defaults to 100 (1–1000). For production,
configure and verify Prisma connection/pool timeouts
and database statement timeouts against deployment requirements. Shutdown awaits
Prisma disconnection; the readiness deadline is not a shutdown deadline. A
successful connectivity probe does not verify migrations or every application
query. Existing HTTP rate
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
{ email, passwordHash })` and `findUserByEmail(prisma, email)`. Pass `app.prisma`;
the repository never creates a client. The registration service calls the password
utility before invoking the repository, so a raw password never reaches Prisma.
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


### Registration (T3.2)

`POST /auth/register` accepts a JSON object containing only `email` and `password`.
Email whitespace is trimmed before JSON Schema email validation, and the service
lowercases it before persistence. The email limit is 254 characters. Passwords
must contain 15–128 characters (Unicode code points), with spaces and Unicode
allowed and no uppercase/digit/symbol composition rule. Passwords are never
trimmed. The route rejects non-string fields and extra fields before Fastify can
coerce or remove them. The body limit is 4096 bytes, including JSON encoding.

Success is HTTP 201 with only `id`, normalized `email`, and ISO `createdAt`.
The controller chooses the HTTP status; the service normalizes email, hashes the
password and selects public fields; the repository performs the Prisma insert.
The response schema supplies an additional field allowlist. No role field exists
in the current model, and this endpoint does not create tokens or cookies.

Duplicate normalized emails return HTTP 409 using the existing error shape:
`{"error":"user_creation_failed","message":"Unable to create user","details":null}`.
The database unique constraint resolves concurrent attempts without a pre-check.
The conflict status still indicates that creation was refused; this is not an
account-enumeration-resistant signup flow. Other persistence failures become a
safe 500 before logging, without retaining Prisma query arguments or hashes.
Malformed JSON, oversized bodies, and unsupported content types are mapped safely
by the existing global error handler rather than logging parser diagnostics.

Registration permits 5 attempts per minute per IP, including invalid requests,
with the existing trusted-proxy configuration. The global 100/minute baseline
remains for other routes. Limits are in-memory per process; shared limits and
hashing concurrency controls need review before multi-instance deployment.
The length policy favors passphrases and bounds work; breached-password screening
and email verification are not implemented in this task.

Run `npm test`, `npm run test:integration`, `npm run lint`, and `npm run build`
from `backend/`. Persistent tests cover success, invalid input, size limits,
duplicates and races; unit tests cover service projection, the route limit, and
absence of passwords/hash/driver markers in failure responses and captured logs.


### Link creation (T4.2)

`POST /links` accepts `{ url, title?, expiresAt? }`. `url` must be an
`http:` or `https:` URL no longer than 2048 characters and is stored exactly as
submitted. `title` is optional and limited to 200 characters. `expiresAt`, when
provided, must be an ISO date-time in the future. The server never fetches the
destination URL.

Successful creation returns HTTP **201** with the generated `shortCode`, the
stored destination, approved optional fields, active status, and timestamps.
Requests without a bearer token create anonymous links and are limited to **5
requests per minute per IP**. Authenticated requests require a verified JWT,
associate the link with that token's `sub`, and are limited to **20 requests per
minute per user**. Invalid or missing authentication when a bearer token is
provided returns **401**; invalid input returns **400** for schema failures or
**422** for an unsupported URL/expiration; exhausted link-creation limits
return **429**; an exhausted short-code collision retry returns **503**.

### Owner link management (T4.3)

Authenticated users can list `GET /links`, view `GET /links/:id`, update with
`PATCH /links/:id`, activate or deactivate with `POST /links/:id/activate` and
`POST /links/:id/deactivate`, and delete with `DELETE /links/:id`. These routes
require a verified JWT. The server uses the verified token subject for every
database query; client-supplied ownership values are not accepted.

List requests accept `page` and `pageSize`; pages start at 1 and page size is
bounded to 100 (default 20). Results are ordered by `createdAt DESC, id DESC`
for stable pagination. Missing and foreign links both return **404**. Successful
list/detail/update/status responses return **200**; deletion returns **204**;
invalid input returns **400** or **422**, and missing authentication returns
**401**.

### Public redirects (T4.4)

`GET /:shortCode` performs one PostgreSQL lookup and returns a **307 Temporary
Redirect** for an existing active link whose expiration has not passed. Missing,
disabled, and expired links return the same **404** response. The redirect path
does not fetch destinations; click capture is described below.

The integration test records a local, single-process latency baseline for 20
sequential requests and prints average and p95 timings. This is a development
measurement only and is not a capacity or production performance claim.

### Click privacy and capture (T6.1)

Redirects synchronously attempt to record one click before returning the `307`
response. The client IP is stored only as an HMAC-SHA-256 digest using the
separate `IP_HASH_SECRET`; raw IP addresses are never sent to Prisma or click
logs. User-agent values are limited to 256 characters, referrers are reduced to
their URL origin and limited to 256 characters, and geolocation is currently
stored as null because no geolocation provider is enabled.

Click records are retained for `CLICK_RETENTION_DAYS` (default 90 days). T6.1
defines the retention policy; scheduled deletion of records is a later
operational task. A tracking write failure is logged as a safe generic warning
and counted in the in-process click tracking failure metric, but does not fail
the redirect response. There is no fire-and-forget tracking promise and no
durable queue in this task.

### Click pipeline decision (T6.2)

The current implementation keeps click persistence as a controlled, awaited
direct PostgreSQL write. The available redirect baseline measured cache hits,
cache misses, and not-found requests, but it did not isolate click-write
latency or record whether T6.1 persistence was enabled. Those results therefore
do not justify adding a Redis-backed queue or claiming that asynchronous
processing is required.

This choice keeps PostgreSQL authoritative and makes failures observable: the
write is awaited, failures increment the in-process tracking-failure metric and
produce a safe warning, and the redirect still returns its correct `307`
response. It also avoids an unobserved promise and avoids introducing queue
delivery semantics before they are needed.

The tradeoff is that a database write remains on the redirect critical path and
a failed write is not retried, so that click may be lost. Before reconsidering
this decision, run a paired measurement with click capture enabled and disabled,
including click-write latency, redirect p95/p99 latency, database contention,
and failure rates. A Redis queue should be introduced only if those measurements
show that direct persistence violates the required latency or reliability
target; that future change would need bounded backpressure, retries with
idempotency, dead-letter handling, and lifecycle metrics.

### Owner click statistics (T6.3)

Authenticated users can request `GET /links/:id/statistics`. The verified JWT
subject is the only ownership input; links belonging to another user and
anonymous links return **404**. The optional `from` and `to` query parameters
are ISO-8601 timestamps, default to the previous 30 days through now, and are
limited to a maximum 90-day range. Supported `granularity` values are
`hour`, `day`, and `week`; the default is `day`. Buckets and returned timestamps
use UTC, and the end of the range is exclusive.

The response contains the total click count, first and last click timestamps,
the bounded time series, and the ten most frequent stored referrer origins and
user-agent values. `countryCode` is not reported because no country detection
is currently supported. The repository performs one ownership check followed
by bounded aggregate queries; it does not load individual clicks or run an
N+plus-one query per bucket. The existing `Click(linkId, clickedAt)` index is
used by the link-scoped time filters; no additional index was added without
query-plan evidence.

#### Query-plan verification

`EXPLAIN ANALYZE` was not run for this implementation: the local PostgreSQL
service was unavailable to the workspace (the Docker daemon socket and the
configured PostgreSQL socket could not be accessed), and no realistic click
dataset was available for execution. Therefore this task does not claim an
observed plan, cost, or runtime.

Static query-shape inspection shows that the existing
`clicks_link_clicked_at_idx` index has the required leading equality column
(`linkId`) followed by the time filter (`clickedAt`). It is therefore the
appropriate candidate for the summary aggregate and the UTC time-series query
when PostgreSQL executes them for one owned link. The ownership relation check
may also require a lookup on `Link`; that is bounded to one link and is covered
by the primary key plus the owner predicate. The top-referrer and user-agent
breakdowns use the same link and time predicates, but their grouping fields are
not indexed speculatively.

Before adding an index, run `EXPLAIN (ANALYZE, BUFFERS)` against a realistic
dataset for the exact endpoint range and granularity queries, confirm whether
the composite index is chosen, and compare planning/execution time and buffer
usage. Record the dataset size, PostgreSQL version, date distribution, and
query parameters with the result.

### Owner QR codes (T7.1)

Authenticated users can request `GET /links/:id/qr`. The endpoint checks the
link through the owner-scoped repository query, constructs the URL from the
server-derived origin and stored short code, and returns bounded SVG with the
`image/svg+xml` content type. Foreign or missing links return **404**. PNG,
admin access, and frontend QR rendering are not part of this endpoint.

### Admin authorization and bootstrap (T7.2)

Users have a persisted `UserRole`: new accounts always receive `USER`, and only
the server can recognize `ADMIN`. Admin hooks run after JWT authentication and
return **401** when there is no valid authenticated user, **403** for a normal
user, and continue only for an administrator. No registration or HTTP request
accepts a role field, so users cannot promote themselves.

After registering the intended account, create the first administrator through
the controlled command below. It refuses to run if an administrator already
exists and updates only the named existing normal user:

```bash
cd backend
npm run admin:bootstrap -- admin@example.com
```

The command must be run by an operator with database access; it is not exposed
as a public endpoint. The role migration must be applied before using the
command.

### Administrative APIs (T7.3)

All `/admin/*` endpoints require JWT authentication and the persisted `ADMIN`
role. Users and links support bounded pages of at most 100 items with stable
newest-first ordering; user search filters email, while link search filters
short code or destination and supports status/user filters. Global statistics
accept UTC `from`/`to` ranges of at most 90 days and return daily totals without
exposing click-level data.

User disable/enable, role changes, user deletion, and link disable/enable are
audited with actor, action, target type, target ID, and timestamp only. The
last effective administrator cannot be disabled, demoted, or deleted. Admin
responses exclude passwords, refresh tokens, access tokens, IP hashes, and
other authentication or click-identifying fields.

### Redirect cache-aside (T5.2)

Redirects use a versioned Redis key in the form
`ushly:v1:redirect:<shortCode>`. Values contain the version, database `linkId`,
destination URL, link status, and expiration timestamp. Only active, non-expired values are
cached, with a maximum TTL of 300 seconds; links expiring sooner receive the
shorter remaining TTL.

PostgreSQL remains authoritative. Redis misses, malformed values, stale status
or expiration values, connection failures, and cache writes that fail all fall
back to the PostgreSQL redirect path. Redis failures therefore do not prevent a
correct redirect or change link state. Cache entries are invalidated after
owner-authorized updates, activation/deactivation, and deletion. Redirect cache
metrics currently expose minimal in-process hit and miss counters for testing
and future observability integration.

### Login and access tokens (T3.3)

`POST /auth/login` accepts only JSON `email` and `password`. It uses registration's
email trimming/lowercasing and format/length checks, a 4 KiB body limit, and a
1–128-character password input limit. Login verifies existing passwords rather
than imposing the registration minimum again. No password normalization occurs.

Success returns HTTP 200 with `{ accessToken, user: { id, email, createdAt } }`
and `Cache-Control: no-store`. The service looks up the normalized email through
the repository and verifies Argon2 via the existing utility. The controller signs
the token using Fastify JWT. Unknown email, wrong password, and accounts without
a local password all return the same HTTP 401 body:
`{"error":"invalid_credentials","message":"Invalid email or password","details":null}`.
A non-account dummy hash with the same Argon2 cost avoids an obvious fast failure
path for missing users; this does not guarantee perfectly equal response times.

`ACCESS_TOKEN_TTL_SECONDS` defaults to **900 (15 minutes)** and must be an integer
between 60 and 3600. `JWT_SECRET` remains required through environment validation;
use a high-entropy secret unique to this application. The existing `@fastify/jwt`
plugin signs/verifies only HS256 here. Issued claims are just `sub` (user ID),
`iat`, and `exp`. JWTs are signed, not encrypted: personal data and credentials
do not belong in their readable payloads.

Future routes opt into authentication with `{ preHandler: app.authenticate }`.
The hook verifies the Bearer token, requires and validates subject and temporal
claims, and sets `request.authenticatedUser` to `{ id }`. It is nullable on
unprotected requests. Missing, malformed, expired, invalid-claim, and tampered
tokens all return `401 {"error":"unauthorized","message":"Authentication required",
"details":null}` through the existing error handler, without exposing verifier
errors. Only test routes are added to exercise protected access in this task.

Login permits **5 attempts/minute/IP**, including bad credentials and invalid
requests. The global 100/minute baseline remains for other routes. Redaction
rules for passwords, hashes, authorization headers, access tokens and JWT secrets
remain applied even with logger overrides; auth errors do not retain raw driver
or JWT errors. Do not log secrets inside free-form message strings.

Access tokens authorize API requests until expiry. Refresh tokens would obtain
new access tokens and require separate persistence/rotation/revocation behavior;
none is implemented here. Current access tokens are not revoked by account
changes or deletion, and the hook does not query the database. Ownership checks
and authorization must still be enforced by future routes. Production follow-up
includes shared rate limiting, signing-key rotation, HTTPS, and reviewed token
storage. Do not reuse this signing secret across applications; issuer/audience
policy must be revisited if token consumers expand.

Verification uses `npm test`, `npm run test:integration`, `npm run lint`, and
`npm run build`. Tests include configurable token lifetime, valid/protected access,
all token failure categories, indistinguishable credential failures, rate limits,
and captured log checks. Integration writes remain limited to `ushly_test`.

### Refresh sessions (T3.4)

Successful login sets the configured refresh cookie. `POST /auth/refresh` reads
that cookie, rotates it, and returns only `{ accessToken }`. `POST /auth/logout`
revokes the session and clears the cookie, returning 204 even if it is absent or
already revoked. Both endpoints use `Cache-Control: no-store`.

Refresh tokens contain 32 cryptographically random bytes. PostgreSQL stores only
SHA-256 hashes; unlike passwords, these tokens already have sufficient entropy
and do not require an expensive password hash. The existing replacement links
identify a session chain, so no schema change is required. A transaction locks
the user's row before rereading token state, serializing refresh/logout even
across server processes. Replaying a rotated token revokes its descendants;
other login sessions remain usable. Concurrent refresh requests count as replay,
so clients must serialize refreshes. Revocation commits before returning 401.

`COOKIE_MAX_AGE` is the session's absolute lifetime in milliseconds (minimum
1000). Rotation preserves that deadline. Cookies are HttpOnly, host-only, scoped
to `/auth`, Secure in production, and use `COOKIE_SAME_SITE`. `none` requires
Secure even outside production. `__Host-` names cannot use the `/auth` path.
Browser origins must be explicitly listed in `CORS_ALLOWED_ORIGINS`, including
the API origin if a same-origin browser deployment uses it. Cookie auth routes
reject unlisted Origins; cross-site requests without Origin are also rejected.
Nonbrowser clients may omit Origin. CORS alone is not a CSRF defense.

Existing access JWTs remain valid until expiration after logout or replay.
Retain rotated token records until the session expires for replay detection;
a future cleanup job may delete expired chains. Chain traversal costs grow with
rotation count, and the per-user lock serializes separate sessions too. Revisit
a session/family table if usage warrants it. Database errors are mapped to safe
public errors before logging. Never log cookie or token values in message text.
