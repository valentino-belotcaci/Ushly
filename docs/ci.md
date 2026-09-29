# Pull-request CI

The workflow in `.github/workflows/ci.yml` runs for every pull request and for
pushes to `main`. It performs three independent checks:

- repository whitespace validation with `git diff --check`;
- backend locked installation, lint, type-check, build, unit tests, migrations,
  and serial integration tests against PostgreSQL 16 and Redis 7;
- frontend locked installation, lint, type-check, unit tests, and production
  build.

Both packages use `npm ci`, so `package-lock.json` is authoritative and a
manifest/lockfile mismatch fails the install. `actions/setup-node` caches npm's
download cache using the corresponding lockfile. It does not cache
`node_modules`, databases, environment files, credentials, or build output.

## Permissions and test configuration

The workflow grants only read access to repository contents. Checkout does not
persist Git credentials. It does not deploy, publish artifacts, write to the
repository, or request production environments.

No repository or organization secrets are required. All configured values are
disposable test-only values defined in the workflow:

- PostgreSQL user `ushly_ci`, database `ushly_test`, and a test-only password;
- `TEST_DATABASE_URL` restricted by the existing integration-test guard to
  `ushly_test` on localhost;
- local Redis at `redis://127.0.0.1:6379`;
- reserved `.example` frontend origins used only to validate the production
  build and generated SEO files.

The integration runner applies committed migrations with `prisma migrate
deploy`. It never connects to the development database, uses `db push`, or
requires OAuth, JWT, database, or production hosting secrets. Google exchanges
remain mocked by the existing tests.

## Branch protection and failure validation

After the workflow has run successfully on GitHub, add these required checks to
the `main` branch protection rule:

- `Repository checks`
- `Backend`
- `Frontend`

To validate failure behavior without weakening a check, create a temporary
branch, add trailing whitespace to a tracked file, push it, and confirm
`Repository checks` fails at `git diff --check`. Remove the whitespace and push
again; the same check must pass. A temporary TypeScript error can similarly
confirm that the relevant build job blocks the pull request. Never merge the
controlled error or add an ignore rule for it.

Locally, the whitespace failure can be demonstrated by temporarily adding a
trailing space to a tracked file, running `git diff --check`, and then restoring
only that temporary character. This does not require database services.
