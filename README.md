# Ushly

Ushly is a full-stack URL shortener built as a production-oriented portfolio
project. It combines public link shortening and QR generation with authenticated
link management, privacy-conscious click analytics, administration, English and
Italian public content, and an AWS deployment pipeline.

## Features

- Create anonymous or account-owned short links with optional titles and expiry.
- Visit, copy, edit, disable, re-enable, and delete owned links.
- Generate and download QR codes for owned links.
- View click totals, UTC time series, referrer origins, and user-agent statistics.
- Register and sign in locally, restore rotating sessions, or use Google OAuth
  with explicit account linking.
- Use responsive public, authentication, dashboard, and administration screens
  in English or Italian, with dark and light themes.
- Serve prerendered public pages with localized metadata, canonical URLs,
  `hreflang`, `robots.txt`, and `sitemap.xml`.

## Current status

The application, automated tests, production containers, CI workflow, and AWS
deployment workflow are implemented in this repository. The production design
uses CloudFront and a private S3 bucket for the frontend, plus API Gateway and a
Lambda container for the backend. AWS resources, DNS, Google OAuth, Upstash, and
database operations are configured outside the repository and must be verified
in each environment.

Performance and availability targets have not been established. The repository
contains a completed local redirect baseline and isolated load-test tooling, but
the result is not production capacity or a service-level guarantee.

## Prerequisites

- Node.js 22 (CI currently uses 22.23.2)
- npm and the committed lockfiles
- Docker with Docker Compose for local PostgreSQL 16 and Redis 7
- Chromium only when running Playwright browser tests

## Quick local setup

Copy the safe templates and replace their placeholders locally:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm --prefix backend ci
npm --prefix frontend ci
```

Start PostgreSQL and Redis:

```bash
docker compose up -d
docker compose ps
```

Apply migrations and run the backend:

```bash
cd backend
npx prisma migrate dev
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

The examples use `http://localhost:3000` for the API and
`http://localhost:5173` for the frontend. Use the same hostname spelling in the
browser, CORS allowlist, cookie configuration, and OAuth callback.

To stop services while retaining named-volume data, run
`docker compose stop`. `docker compose down` removes the containers but does not
remove named volumes unless explicitly requested.

## Environment configuration

| File | Purpose |
| --- | --- |
| `.env.example` | Local Docker Compose PostgreSQL and Redis settings. |
| `backend/.env.example` | Validated backend runtime settings and secret placeholders. |
| `frontend/.env.example` | Public Vite build values and optional public legal details. |

`VITE_SITE_ORIGIN` and `VITE_API_ORIGIN` are embedded in browser assets and are
not secrets. Database URLs, Redis credentials, JWT and IP-hash secrets, OAuth
client secrets, passwords, and tokens are backend-only runtime secrets. Never
commit copied `.env` files.

## Database migrations

Create and apply a migration during local schema development:

```bash
cd backend
npx prisma migrate dev
```

Apply already committed migrations in CI, staging, or production:

```bash
cd backend
npx prisma migrate deploy
```

Do not use `prisma db push` in place of versioned production migrations.
Production migrations are a separate manual release operation; neither the
Lambda handler nor the deployment workflow runs them automatically.

## Development, tests, and builds

Run backend commands from `backend/`:

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Integration tests require `NODE_ENV=test`, `REDIS_URL`, and a guarded
`TEST_DATABASE_URL` pointing to the dedicated local `ushly_test` database. The
runner reads process environment variables, applies committed migrations, and
refuses unsafe database targets.

Run frontend commands from `frontend/`:

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

The production frontend build requires valid `VITE_SITE_ORIGIN` and
`VITE_API_ORIGIN`. Install Playwright's Chromium once with
`npx playwright install chromium` before browser tests.

## Demo

For a local demo, start Docker Compose, apply migrations, and run both development
servers as shown above. Open `http://localhost:5173`, create a short link, then
register or sign in to demonstrate owned-link management, QR download, and
analytics. Create an administrator only when required:

```bash
cd backend
npm run admin:bootstrap -- admin@example.com
```

The bootstrap command promotes an existing account and refuses to create another
administrator when one already exists. Google login requires a separately
configured OAuth client. No public demo URL is asserted by this documentation.

## Load-test status

The committed [redirect baseline report](loadtest/reports/redirect-baseline.md)
records one local, single-process run: 1,502 scenario checks passed, with custom
scenario error rates of 0%. It reports local latency and container observations,
but did not record the Git revision, host identity, Node/k6 versions, backend
CPU/memory, or database query timing. Treat it only as a reproducible development
baseline. Production throughput, concurrent Lambda behavior, scaling limits,
availability, and service-level objectives remain unmeasured.

## Repository structure

```text
.
├── backend/                 Fastify API, Prisma schema, Lambda image, and tests
├── frontend/                React application, prerenderer, and browser tests
├── docs/                    Architecture and operational documentation
├── .github/workflows/       Pull-request CI and production deployment
├── docker-compose.yml       Local PostgreSQL, Redis, and load-test database
└── loadtest/                Isolated load-test scripts
```

## Documentation

- [Architecture](docs/architecture.md)
- [Frontend](docs/frontend.md)
- [Backend](docs/backend.md)
- [Deployment and operations](docs/deployment.md)
- [Security](docs/security.md)

## Technical decisions

- PostgreSQL is the source of truth; Redis provides cache-aside redirects,
  shared rate limiting, and short-lived OAuth state.
- Access tokens remain in frontend memory. Rotating refresh tokens are stored as
  hashes in PostgreSQL and sent through an HttpOnly cookie.
- The frontend and backend deploy independently. Database migrations remain a
  separate, operator-controlled step.
- The local HTTP server and Lambda handler share one Fastify app factory. Lambda
  uses its dedicated AWS runtime image rather than the regular server image.
- Public pages are prerendered; authenticated application pages are marked for
  exclusion from search indexing.

## Security summary

The backend validates configuration and requests, enforces ownership and admin
authorization server-side, uses Argon2id password hashes, rotates refresh
sessions, applies Redis-backed rate limits, pseudonymizes IP addresses, and
redacts sensitive log fields. Production uses exact CORS origins, Secure
host-only cookies, private RDS networking, private S3 access through CloudFront,
and short-lived GitHub OIDC credentials. See [Security](docs/security.md) for
boundaries and operational requirements.

## Known limitations and future work

- Email verification, password reset, custom domains, teams, subscriptions, and
  a public API are not implemented.
- Click retention has a configured policy, but scheduled deletion is not yet
  implemented.
- A failed click write does not block a redirect, but that click is not retried.
- Production Lambda concurrency and PostgreSQL pooling need measured tuning.
- Full observability, alerting, backup restoration drills, and incident runbooks
  remain operational work.
- Google OAuth, DNS, IAM, VPC routing, backups, and third-party consoles require
  manual production verification.
- Legal templates require verified operator details and review before launch.
- Future work includes measured capacity testing, automated retention cleanup,
  stronger account lifecycle features, and professionally reviewed translations.
