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