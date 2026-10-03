# Security

This document describes controls present in the repository and the operational
controls required around them. It contains placeholders only; real credentials
belong in local ignored files or managed runtime secret storage.

## Secrets and configuration

- Only `.env.example` templates are tracked. Never commit `.env` files,
  credentials, tokens, private keys, provider responses, or production data.
- `VITE_*` values are public because Vite embeds them into browser assets. Never
  place a database URL, Redis token, OAuth client secret, JWT secret, password,
  or IP-hash secret in a frontend variable.
- Backend configuration is validated at startup. Production requires Secure
  cookies and an HTTPS Google callback. Secrets must be high-entropy and unique
  per environment.
- GitHub repository variables identify public origins and AWS resources. AWS
  access keys are not stored in GitHub; the workflow exchanges a GitHub OIDC
  token for short-lived role credentials.

Example documentation values such as `<database-url>` and `<secret>` are not
usable credentials.

## Authentication and session protection

Local passwords use Argon2id with per-password random salts. Passwords and
password hashes are excluded from public responses and redacted from structured
logs. Login uses a dummy hash for unknown accounts to reduce the obvious timing
difference, while acknowledging that exact timing equality is not guaranteed.

Access JWTs use HS256, contain only `sub`, `iat`, and `exp`, and live in frontend
memory. They are short-lived and remain valid until expiry after logout. Refresh
tokens are cryptographically random; PostgreSQL stores SHA-256 hashes rather
than raw values. Rotation detects replay and revokes the affected descendant
chain. The browser receives refresh tokens only in a host-only, HttpOnly cookie
scoped to `/auth`, with `Secure` required in production and validated SameSite
configuration.

## Google OAuth

The server validates an exact configured callback URL and does not accept a
client-selected redirect URI. OAuth attempts use independent state, nonce, and
PKCE S256 values. Redis stores a hashed, expiring, single-use transaction; the
callback atomically consumes it before code exchange. The provider ID token is
checked for signature, issuer, audience, authorized party, nonce, time bounds,
verified email, and bounded subject.

Google login never merges an account only because email addresses match.
Linking requires an authenticated local account and fresh password verification.
The popup completion page sends only success or a safe error code to exact
allowed frontend origins; it never sends credentials or provider data.

## Authorization and input controls

Ownership and administrator permissions are enforced in Fastify from the
verified JWT subject and persisted role. Client-supplied user IDs never grant
access. Foreign and missing owned links share a safe not-found response. The
last effective administrator cannot be disabled, demoted, or deleted.

Fastify JSON schemas, explicit pre-validation, URL protocol checks, body limits,
pagination bounds, date-range limits, and response projections constrain system
boundaries. The redirect service never fetches a destination URL. Known errors
use stable public codes; unexpected failures return a generic response without
stack traces or driver details.

## CORS, CSRF, cookies, and rate limiting

CORS permits exact configured browser origins and credentials. Auth routes also
reject unlisted Origins and cross-site browser requests without an Origin, so
CORS is not treated as the only CSRF control. Wildcard credentialed origins are
not supported. Proxy trust must remain false or be restricted to the real proxy
address/CIDR. In Lambda, the adapter-provided API Gateway event is used for the
configured OAuth host without trusting arbitrary forwarded headers.

Global and route limits use Redis so counters are shared across instances.
Registration and login are limited more strictly, OAuth has its own limit, and
link creation distinguishes authenticated users from anonymous IPs. Redis
failure causes protected limit operations to fail closed rather than silently
bypassing enforcement.

## Privacy and logging

Click IPs are stored only as an HMAC-SHA-256 digest using `IP_HASH_SECRET`.
Referrers are reduced to origins, user-agent values are bounded, and no
geolocation provider is enabled. The configured click-retention period is a
policy; automated deletion is not currently scheduled.

Fastify redacts authorization headers, cookies, passwords, hashes, tokens,
OAuth state, nonce, verifiers, and secrets. Request serialization omits query
strings because OAuth callbacks contain sensitive values. CloudWatch and any
upstream access logging must follow the same restriction. Log access should be
limited by IAM, retention should be configured, and logs should never be used
as secret storage.

## AWS boundaries

- The frontend bucket is private. CloudFront reads it through Origin Access
  Control and a bucket policy restricted to the distribution.
- RDS is private and accepts PostgreSQL only from the Lambda security group and
  explicitly temporary migration access.
- Lambda uses private subnets and requires outbound NAT access for Upstash and
  Google OAuth. Security groups should grant only required traffic.
- The GitHub OIDC role trust policy must name the repository and `main` branch.
  Its permissions must be scoped to the one bucket, distribution, repository,
  and Lambda function used by the workflow.
- Deployment variables must not contain application secrets. Runtime secrets
  remain in Lambda configuration or an approved secret service.

## Dependency failure and incidents

PostgreSQL is authoritative. Redis cache failures may fall back to PostgreSQL,
but OAuth state and rate limiting fail closed. Database failures produce safe
errors. `/health` reports process liveness; `/health/ready` reports PostgreSQL
and Redis readiness.

Rotate JWT, IP-hash, database, Redis, and OAuth credentials manually using a
planned rollout. Rotation can invalidate sessions or change pseudonymous IP
continuity, so record the impact and rollback point first. Preserve the previous
frontend objects and Lambda image URI for code rollback. Database migrations do
not roll back with application code and need an explicit, tested recovery plan.
During an incident, restrict access, preserve safe audit evidence, rotate exposed
credentials, and verify logs do not contain the secret itself.

## Known gaps

Automated secret rotation, full alerting, scheduled click deletion, a practiced
restore procedure, and a complete incident runbook are not implemented in this
repository. External AWS, Upstash, DNS, and Google Cloud settings cannot be
verified from source alone.
