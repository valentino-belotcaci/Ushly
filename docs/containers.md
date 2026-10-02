# Production containers

Ushly has separate production images for the API and static frontend. Both use
multi-stage builds, install JavaScript dependencies with `npm ci`, and run as
non-root users. Environment files are excluded from both build contexts.

## Build

Run from the repository root. The two `VITE_*` values are public values embedded
in the browser bundle; they are not secret configuration.

```bash
docker build -t ushly-backend:local ./backend
docker build \
  --build-arg VITE_API_ORIGIN=https://api.example.com \
  --build-arg VITE_SITE_ORIGIN=https://app.example.com \
  -t ushly-frontend:local ./frontend
```

The backend image contains compiled JavaScript, production dependencies, and the
generated Prisma engine. It does not contain the Prisma CLI or migrations. Apply
the committed migrations as a separate deployment step before replacing API
containers:

```bash
cd backend
npm ci
DATABASE_URL='postgresql://<user>:<password>@<host>:5432/<database>' npm exec prisma migrate deploy
```

In production, inject runtime configuration with the hosting platform's secret
manager. Do not pass secrets as Docker build arguments or bake an `.env` file
into an image.

## Local container smoke test

Start the existing data services and ensure migrations have been applied:

```bash
docker compose up -d postgres redis
docker compose ps
```

Create an ignored `backend/.env.container` from `backend/.env.example`. Set
`HOST=0.0.0.0`, use `postgres` and `redis` as the database/cache hosts, and make
the PostgreSQL credentials match the values used by Compose. Keep local secrets
in this ignored file.

```bash
docker run --rm -d \
  --name ushly-backend \
  --network ushly_default \
  --env-file backend/.env.container \
  -p 3000:3000 \
  ushly-backend:local

docker run --rm -d \
  --name ushly-frontend \
  -p 8080:8080 \
  ushly-frontend:local
```

The production backend configuration must retain the secure cookie and exact
origin requirements described in `docs/deployment.md`. The frontend image needs
no runtime secrets: its API and site origins were validated during the build.

Verify application and Docker health:

```bash
curl --fail http://127.0.0.1:3000/health/live
curl --fail http://127.0.0.1:3000/health/ready
curl --fail http://127.0.0.1:8080/container-health
docker inspect ushly-backend ushly-frontend \
  --format '{{.Name}} {{.State.Health.Status}} user={{.Config.User}}'
```

`/health/ready` intentionally fails when PostgreSQL or Redis is unavailable.
The frontend health path checks the static server without entering React
routing. Stop the API with Docker's normal `SIGTERM`; `server.ts` awaits
`app.close()`, including Prisma and Redis cleanup:

```bash
docker stop --timeout 15 ushly-backend ushly-frontend
```

## Image inspection and scanning

Check the final application files for accidentally copied environment files:

```bash
docker run --rm --entrypoint sh ushly-backend:local -c \
  "test -z \"$(find /app \\( -name '.env' -o -name '.env.*' \\) -print -quit)\""
docker run --rm --entrypoint sh ushly-frontend:local -c \
  "test -z \"$(find /usr/share/nginx/html \\( -name '.env' -o -name '.env.*' \\) -print -quit)\""
```

Trivy can scan saved images without giving the scanner access to the Docker
socket. The command is pinned for reproducibility, ignores vulnerabilities for
which no fix exists, and fails on fixable high or critical findings:

```bash
docker save ushly-backend:local -o /tmp/ushly-backend.tar
docker save ushly-frontend:local -o /tmp/ushly-frontend.tar

docker run --rm -v /tmp:/scan:ro aquasec/trivy:0.74.0 image \
  --input /scan/ushly-backend.tar --ignore-unfixed \
  --severity HIGH,CRITICAL --exit-code 1
docker run --rm -v /tmp:/scan:ro aquasec/trivy:0.74.0 image \
  --input /scan/ushly-frontend.tar --ignore-unfixed \
  --severity HIGH,CRITICAL --exit-code 1
```

Delete the temporary image archives after reviewing the reports. Refresh base
image and scanner pins deliberately, rebuild, and repeat the scan as part of
release maintenance.
