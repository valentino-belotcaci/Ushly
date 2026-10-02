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

## Production deployment workflow

`.github/workflows/deploy.yml` runs only after the existing `Pull request CI`
workflow completes successfully for a push to `main`. It checks out
`workflow_run.head_sha`, so deployment uses the exact commit verified by CI.
Pull-request workflow runs and failed or cancelled CI runs cannot enter either
deployment job.

The workflow requires these GitHub repository variables:

| Variable                     | Value                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| `AWS_ROLE_ARN`               | ARN of the narrowly scoped IAM role trusted through GitHub OIDC        |
| `AWS_REGION`                 | AWS region containing ECR and Lambda                                   |
| `VITE_SITE_ORIGIN`           | Public HTTPS frontend origin compiled into the Vite build              |
| `VITE_API_ORIGIN`            | Public HTTPS API origin compiled into the Vite build                   |
| `S3_BUCKET`                  | Private frontend bucket name, without `s3://`                          |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution serving the private S3 origin                             |
| `ECR_REPOSITORY`             | Existing private ECR repository name, without registry hostname or tag |
| `LAMBDA_FUNCTION`            | Existing image-based Lambda function name or ARN                       |

These values identify public origins or AWS resources; they are not application
secrets. Do not configure access-key variables or store long-lived AWS access
keys in GitHub. The workflow grants `id-token: write` solely so
`aws-actions/configure-aws-credentials` can exchange GitHub's OIDC token for
short-lived role credentials. Configure the role trust policy for this
repository and `refs/heads/main` only.

The IAM role needs only the deployed resources and these actions:

- S3 list plus object read/write/delete for `S3_BUCKET`;
- `cloudfront:CreateInvalidation` for `CLOUDFRONT_DISTRIBUTION_ID`;
- `ecr:GetAuthorizationToken` and the layer/image upload actions for
  `ECR_REPOSITORY`;
- `lambda:UpdateFunctionCode` and `lambda:GetFunctionConfiguration` for
  `LAMBDA_FUNCTION`.

The frontend job runs `npm ci` and builds with the two repository-provided
`VITE_*` origins before requesting AWS credentials. It synchronizes the contents
of `frontend/dist` to S3 with deletion of obsolete objects, then creates a `/*`
CloudFront invalidation.

The backend job invokes `npm run build:lambda-image`, whose entrypoint, handler,
and architecture checks prevent the regular backend image from being published
as a Lambda artifact. It tags that verified image with the full tested Git commit
SHA, pushes the immutable tag to ECR, updates Lambda to that exact URI, and waits
for the update to finish. It does not run Prisma migrations or alter Lambda
configuration and environment variables.
