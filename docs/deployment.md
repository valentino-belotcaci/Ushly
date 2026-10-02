# Ushly deployment configuration

This document covers T9.13 configuration. It describes the current application
contracts; it does not provision infrastructure or deploy the application.

## Public and private configuration

Vite replaces every `VITE_*` value at build time. Anyone who downloads the
frontend can read those values, so they must contain public configuration only.

| Variable | Where | Purpose | Secret? |
| --- | --- | --- | --- |
| `VITE_API_ORIGIN` | Frontend build | Public Fastify API and short-link origin | No |
| `VITE_SITE_ORIGIN` | Frontend build | Public SPA origin used by canonical, Open Graph, hreflang, sitemap, and robots URLs | No |
| `VITE_LEGAL_NAME` | Frontend build | Verified public operator name shown in legal templates | No |
| `VITE_LEGAL_CONTACT_EMAIL` | Frontend build | Verified public privacy/contact address | No |
| `CORS_ALLOWED_ORIGINS` | Backend runtime | Exact browser origins allowed to call Fastify with credentials | No, but server-only |
| `GOOGLE_OAUTH_REDIRECT_URI` | Backend runtime | Exact public backend callback URL | No, but server-only |
| `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `IP_HASH_SECRET`, `GOOGLE_CLIENT_SECRET` | Backend runtime | Database, cache, signing, pseudonymization, and OAuth credentials | **Yes** |

Store private values in the hosting provider's secret manager. Never prefix a
secret with `VITE_`. Repository `.gitignore` excludes `.env` and `.env.*` while
explicitly allowing only the safe `.env.example` files. Check staged changes
before every commit; generated frontend assets also contain the public `VITE_*`
values used for that build.

Origins must be exact: include the scheme and any non-default port, omit paths,
queries, fragments, credentials, and trailing slashes. Origin comparison is
string-exact in backend CORS and auth request checks.

## Local development

Copy the examples without committing the copies:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

The supplied frontend example uses this direct local layout:

| Setting | Local value |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend/API | `http://localhost:3000` |
| `VITE_SITE_ORIGIN` | `http://localhost:5173` |
| `VITE_API_ORIGIN` | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | includes exactly `http://localhost:5173` |
| `COOKIE_SECURE` / `COOKIE_SAME_SITE` | `false` / `lax` |
| Google callback, when enabled | `http://localhost:3000/auth/google/callback` |

Use one hostname spelling consistently. `localhost` and `127.0.0.1` are
different origins and cookie hosts. If the browser uses `127.0.0.1`, update all
corresponding frontend, CORS, and callback values to that spelling.

Start PostgreSQL and Redis from the repository root, then start each package:

```bash
docker compose up -d
cd backend && npm ci && npm run dev
cd frontend && npm ci && npm run dev
```

## Production configuration

A typical same-site deployment uses `https://app.example.com` for the frontend
and `https://api.example.com` for Fastify:

```dotenv
# Frontend build environment (public)
VITE_SITE_ORIGIN=https://app.example.com
VITE_API_ORIGIN=https://api.example.com

# Backend runtime environment
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://app.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
GOOGLE_OAUTH_REDIRECT_URI=https://api.example.com/auth/google/callback
```

Replace the example domains with owned HTTPS origins. The frontend build
rejects missing origins and malformed values, including trailing slashes. Set
`CORS_ALLOWED_ORIGINS` to every real browser origin that may call the API, as a
comma-separated list; do not use wildcards when credentials are enabled.

`app.example.com` and `api.example.com` are cross-origin but same-site, so a
`SameSite=Lax` refresh cookie can be used over HTTPS. If the frontend and API
are on genuinely different sites, set `COOKIE_SAME_SITE=none`; the backend
requires `COOKIE_SECURE=true` for this mode. Confirm browser behavior in the
actual deployment before launch.

The refresh cookie is always `HttpOnly`, host-only (no `Domain` attribute), and
scoped to `/auth`. Production always makes it `Secure`. Its lifetime comes from
`COOKIE_MAX_AGE`. The temporary Google state cookie is also `HttpOnly`,
host-only, `SameSite=Lax`, scoped to `/auth/google`, and Secure in production.
The frontend keeps access tokens in memory and calls refresh/logout with
`credentials: 'include'`; it cannot weaken these server-controlled attributes.

If TLS terminates at a reverse proxy, forward the original HTTPS scheme and
host and set `TRUST_PROXY` only to the real proxy address or CIDR. Do not use a
broad trust setting. Route API, redirect, and `/auth/google/*` requests to
Fastify at the public API origin.

## Google OAuth callback

Create separate Google OAuth clients for local development and production.
Register the exact value of `GOOGLE_OAUTH_REDIRECT_URI` in Google Cloud Console.
For the direct layouts above these are:

- local: `http://localhost:3000/auth/google/callback`
- production: `https://api.example.com/auth/google/callback`

The backend validates the scheme, host, and fixed `/auth/google/callback` path;
production requires HTTPS. The frontend opens the backend OAuth start route,
and the callback sends a status only to exact `CORS_ALLOWED_ORIGINS` entries.
Client secrets remain backend-only. If a reverse proxy exposes the callback at
another public origin, register that exact public URL and route it to Fastify.

Google Cloud Console cannot be verified from this repository. Before launch,
confirm the registered redirect URI character-for-character and complete one
login and one explicit account-linking browser flow against production.

## Build, preview, and hosting

Set production `VITE_*` values in the hosting provider's **build** environment,
then run from `frontend/`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Publish `frontend/dist/`. The build prerenders public English and Italian pages
and writes `sitemap.xml` and `robots.txt` using `VITE_SITE_ORIGIN`. Configure the
host to serve these generated files directly and use `dist/200.html` as the SPA
fallback for client routes. Do not replace `sitemap.xml` or `robots.txt` with
the fallback page.

After deployment, verify:

1. `sitemap.xml`, `robots.txt`, canonical, Open Graph, and hreflang URLs use the
   final `VITE_SITE_ORIGIN` and contain no localhost URLs.
2. Browser requests target `VITE_API_ORIGIN`; the response allows the exact
   frontend Origin and includes `Access-Control-Allow-Credentials: true`.
3. Login, reload/session restoration, logout, Google login, and explicit Google
   linking work over HTTPS. Inspect cookie flags without copying cookie values.
4. The Google Console callback exactly equals `GOOGLE_OAUTH_REDIRECT_URI`.
5. Backend database migrations and health checks succeed before traffic moves.

Changing either frontend origin requires a new frontend build. Changing CORS,
cookies, OAuth, proxy trust, or secrets requires a backend configuration rollout.
