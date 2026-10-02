# AWS Lambda backend packaging and deployment

Ushly can run either as the existing long-lived HTTP server or as an AWS Lambda
function. Both entry points use `buildApp()` from `backend/src/app.ts`, so routes,
plugins, validation, authentication, cookies, CORS, rate limiting, Redis, OAuth,
redirects, and health endpoints remain identical.

## Local HTTP execution

Local development and container execution continue to use `src/server.ts`:

```bash
cd backend
npm run dev
# or
npm run build
npm start
```

`src/server.ts` owns the listening socket and graceful process shutdown. The
Lambda entry point never calls `listen()`.

## Lambda container image through ECR

The preferred ECR artifact uses `backend/Dockerfile.lambda`. It is separate from
the regular backend Dockerfile: the regular image starts `dist/server.js` and is
for EC2 or Docker Compose, while the Lambda image uses the AWS Node.js runtime
and invokes `dist/lambda.handler`.

Build the Lambda image for the function's `x86_64` architecture:

```bash
cd backend
npm run build:lambda-image
```

The default local tag is deliberately distinct from the regular HTTP image:

```text
ushly:lambda
```

The build script verifies the image entrypoint, handler command, and architecture
after every build. Override the local tag only when needed:

```bash
LAMBDA_IMAGE_TAG=ushly:lambda-v2 npm run build:lambda-image
```

The image declares the handler through:

```dockerfile
CMD ["dist/lambda.handler"]
```

After tagging and pushing `ushly:lambda` to ECR, create or update an image-based
Lambda function with that image URI. The Lambda console does not show the ZIP
runtime-handler field for container images. The image `CMD` supplies it; an
optional **Image configuration → Command override** would use the same value:

```text
dist/lambda.handler
```

Do not push the regular `ushly` backend image to Lambda because its command
starts a listening HTTP server instead of exporting a Lambda handler.

## ZIP artifact

The repository can also produce an AWS Lambda ZIP for `x86_64`. Docker is
required to build it:

```bash
cd backend
npm run package:lambda
```

The command builds inside AWS's official Lambda Node.js 22 image. This matters
because Prisma's query engine and `argon2` are native Linux dependencies and
must match the Lambda Amazon Linux runtime. The resulting file is:

```text
backend/artifacts/ushly-backend-lambda.zip
```

The ZIP contains compiled JavaScript, production dependencies, generated Prisma
Client and its native engine, and the native password-hashing module. It excludes
project source, tests, development dependencies, migrations, and environment
files. Build the artifact for `x86_64`; changing the Lambda architecture requires
rebuilding native dependencies for that architecture.

The Lambda handler setting is:

```text
dist/lambda.handler
```

## Recommended Lambda and API Gateway configuration

- Runtime: Node.js 22.x
- Architecture: x86_64
- Region assumption: Europe (Frankfurt), `eu-central-1`
- Memory: 1024 MB initially; adjust only from measured memory and duration
- Lambda timeout: 30 seconds
- API: API Gateway HTTP API
- Integration: Lambda proxy, payload format version 2.0
- Binary media configuration: none currently required; QR responses are SVG text
- Reserved concurrency: start with a small limit to protect PostgreSQL connection
  capacity, then tune from measurements

API Gateway must forward every application route to the same handler. Preserve
the original path and query string. Configure the public API origin consistently
in CORS, cookies, frontend build variables, canonical URLs, and Google OAuth.

## Connection lifecycle

`src/lambda.ts` constructs and readies Fastify at module scope. Lambda therefore
creates Prisma and Redis clients during a cold start and reuses those clients for
warm invocations in the same execution environment. It does not close them after
each request, because that would defeat connection reuse.

Each concurrent Lambda execution environment still has its own Prisma pool and
Redis connection. Set reserved concurrency according to database capacity and
use a database connection pooler before allowing high concurrency. PostgreSQL
and Redis must be network-reachable from the Lambda function. If they are in a
VPC, attach Lambda to subnets and security groups that provide the required
private connectivity; outbound access is also required for Google OAuth.

Cold-start readiness attempts Redis once using the existing bounded reconnect
settings. A dependency outage preserves the existing safe failure behavior:
health readiness and Redis-dependent operations report an unavailable service
rather than silently bypassing rate limiting or OAuth state validation.

## Runtime environment

Configure these values in Lambda environment variables or retrieve secrets at
deployment/runtime through an approved AWS secret store. Never place them in the
ZIP or frontend variables.

Required application configuration:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATABASE_URL=<private PostgreSQL connection URL>
DATABASE_READY_TIMEOUT_MS=1000
REDIS_URL=<private TLS Redis URL when supported>
REDIS_CONNECT_TIMEOUT_MS=1000
REDIS_MAX_RECONNECT_ATTEMPTS=5
REDIS_RECONNECT_BASE_DELAY_MS=100
IP_HASH_SECRET=<secret, at least 32 characters>
CLICK_RETENTION_DAYS=90
LOAD_TEST_MODE=false
LOAD_TEST_RATE_LIMIT_MAX=100000
JWT_SECRET=<different secret, at least 32 characters>
ACCESS_TOKEN_TTL_SECONDS=900
COOKIE_NAME=ushly_session
COOKIE_SECURE=true
COOKIE_SAME_SITE=<lax or none according to the final origin topology>
COOKIE_MAX_AGE=86400000
CORS_ALLOWED_ORIGINS=<exact HTTPS frontend origin>
TRUST_PROXY=false
```

`HOST` and `PORT` remain required by the shared validated configuration, but the
Lambda handler does not open a socket. Do not enable load-test mode in production.

Google OAuth additionally requires all of:

```text
GOOGLE_CLIENT_ID=<runtime secret/configuration>
GOOGLE_CLIENT_SECRET=<runtime secret>
GOOGLE_OAUTH_REDIRECT_URI=https://<api-origin>/auth/google/callback
GOOGLE_OAUTH_STATE_TTL_SECONDS=300
```

API Gateway supplies the client address in its version 2 proxy event and the
adapter translates it into the injected Fastify request. `TRUST_PROXY=false`
avoids trusting arbitrary forwarded headers. Revalidate this setting against the
final API Gateway event and any additional proxy layer before deployment.

## Migrations

Migrations are never run from the request handler. Apply committed migrations as
a separate, bounded release step from CI or an administrative environment that
can reach PostgreSQL:

```bash
cd backend
npm ci
DATABASE_URL='<production URL>' npx prisma migrate deploy
```

Run migrations before shifting API Gateway traffic to code that needs the new
schema. Do not package migration credentials into the Lambda artifact.

## Verification and rollback limits

Before deployment, inspect the ZIP and confirm it contains no `.env` files,
credentials, tests, source files, or development-only dependencies. After upload,
smoke-test health, cookies, login/refresh/logout, OAuth, links, redirects, QR,
analytics, administration, and error responses through API Gateway.

Lambda code versions and aliases can roll application code back to a previous
ZIP. They do not roll back PostgreSQL migrations, Redis state, environment
variables, API Gateway configuration, or secrets. Keep schema migrations backward
compatible with the previous Lambda version and record the artifact checksum,
configuration revision, and deployed commit for every release.
