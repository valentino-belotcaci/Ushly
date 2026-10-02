# ADR 0001: AWS hosting for the portfolio launch

- **Status:** Proposed; architecture recommended, deployment not approved
- **Date:** 2026-09-30
- **Scope:** A small, single-region portfolio deployment on AWS

## Context

Ushly needs an inexpensive public environment that demonstrates the existing
Dockerized frontend, API, PostgreSQL, and Redis application without introducing
managed-service complexity before traffic or persistence requirements justify
it. The deployment may use a new AWS account's Free Tier and up to USD 200 in
promotional credits.

This decision replaces the earlier Render proposal. It does not authorize an
AWS account, IAM identity, network, instance, domain, credential, or deployment.
Every real AWS action requires separate explicit approval.

## Decision

Use one **EC2 `t3.small` instance in Europe (Frankfurt), `eu-central-1`** for the
initial portfolio launch. Run the existing frontend, backend, PostgreSQL 16, and
Redis 7 containers with Docker Compose on that instance. Add Caddy as the only
internet-facing container for HTTPS and reverse proxying.

The instance will use:

- Ubuntu Server LTS on x86-64;
- 2 vCPUs and 2 GiB RAM;
- one 30 GiB encrypted `gp3` EBS root volume;
- one Elastic IP while the demo is public;
- Caddy on ports 80 and 443;
- the frontend Nginx container and backend API on the private Compose network;
- PostgreSQL and Redis on private Compose networks and named EBS-backed Docker
  volumes;
- no load balancer, NAT Gateway, ECS, RDS, ElastiCache, or public database/cache
  port.

`t3.micro` has only 1 GiB RAM and leaves too little headroom for the operating
system, Docker, Node.js, PostgreSQL, Redis, and image deployment. `t3.small` is
the smallest practical x86 instance for this combined design. Memory, CPU
credits, disk space, and container restarts must be monitored; it is not a
high-availability architecture.

## Options considered

| Concern | Single EC2 with frontend — selected | EC2 API plus S3/CloudFront frontend |
| --- | --- | --- |
| Simplicity | One host, one Compose deployment, one reverse proxy, and one backup boundary. | Adds S3, CloudFront, cache invalidation, response-header policy, and separate deployment steps. |
| Frontend cost | Included in EC2 and EBS usage. | Usually cents for portfolio traffic, but request and transfer charges remain usage-based. |
| Authentication | Frontend and API can use subdomains of one domain, simplifying exact CORS and cookie configuration. | Separate CDN and API origins require additional CORS, CSP, and cookie validation. |
| Availability | The whole application stops if the instance or volume fails. | Static pages remain available if EC2 is stopped, but authenticated and redirect features still fail. |
| Deployment | Reuses the existing production images and Compose concepts. | Frontend becomes a separate artifact and release path. |
| Scaling | Vertical resize first; later separate stateful services. | Frontend already scales independently through CloudFront. |

S3 and CloudFront are the preferred first optimization if frontend traffic or
static availability becomes important. They are unnecessary for the initial
portfolio release.

## Estimated cost and credit use

The estimate below is a planning range for an always-on month in Frankfurt.
AWS prices vary by region, taxes, data transfer, snapshot size, CPU-credit use,
and future price changes. Confirm the estimate in AWS Pricing Calculator before
creating resources.

| Item | Planning estimate per month |
| --- | ---: |
| `t3.small` Linux EC2, about 730 hours | USD 17–20 |
| 30 GiB encrypted `gp3` EBS | USD 3–4 |
| One public IPv4/Elastic IP | Up to USD 3.65 |
| EBS snapshots with short retention | About USD 1–3 initially |
| DNS | USD 0 with an external DNS provider, or about USD 0.50 per Route 53 hosted zone plus domain registration |
| Light outbound traffic and CloudWatch usage | Usually within free allowances; usage-based afterward |
| **Expected total** | **Approximately USD 22–31/month before tax and domain registration** |

AWS currently charges USD 0.005 per public IPv4 address-hour, although eligible
EC2 Free Tier usage can include 750 public IPv4 hours. One address must still be
budgeted because eligibility depends on the account and offer.

At USD 22–31/month, USD 100 of initial credit covers roughly three to four
always-on months. The full USD 200, if all additional credits are earned, covers
roughly six to nine months. The Free Plan itself ends after six months or when
credits are depleted, whichever comes first. Credit coverage is not a guarantee
that a resource is free; metered usage consumes the credit balance.

## AWS Free Tier constraints

For eligible new accounts created under AWS's current program:

- the Free Plan supplies USD 100 at signup and allows up to USD 100 more through
  specified activities;
- the Free Plan lasts at most six months and closes when the period or available
  credits end unless the account is upgraded;
- promotional credits have their own expiry shown in Billing; joining an AWS
  Organization can terminate Free Tier credit eligibility;
- a Paid Plan can incur usage charges after credits or free allowances are
  exhausted;
- burstable T3 instances can accrue surplus CPU-credit charges in Unlimited
  mode during sustained CPU use;
- the offer, eligible services, and remaining credits must be checked in Billing
  before launch rather than assuming the previous 12-month EC2 offer applies.

The deployment must be treated as disposable portfolio infrastructure until a
paid operating budget and recovery requirements are approved.

## Network and host security

Use one VPC with one public subnet and no NAT Gateway. The EC2 security group
allows:

- TCP 80 from `0.0.0.0/0` and `::/0` for ACME validation and HTTPS redirect;
- TCP 443 from `0.0.0.0/0` and `::/0` for the application;
- no public access to 3000, 5432, 6379, or the frontend container port;
- TCP 22 only from the maintainer's current `/32` IP when emergency SSH is
  explicitly enabled.

AWS Systems Manager Session Manager is preferred to permanent SSH exposure. The
instance receives a narrowly scoped IAM role for Session Manager, CloudWatch,
and only the parameters and backup location it needs. Root SSH and password
authentication remain disabled. If SSH is used, use an individual key, restrict
the source IP, and remove the rule when maintenance ends.

Enable IMDSv2 only, automatic security updates, host firewall rules consistent
with the security group, Docker log rotation, and least-privilege filesystem
permissions. PostgreSQL and Redis bind only to their Compose network; their
Compose host port mappings must be removed or bound to loopback in the production
override.

## HTTPS and DNS

Use a domain or subdomain controlled by the maintainer. Point frontend and API
DNS records at the instance's Elastic IP, for example:

- `ushly.example.com` for the frontend;
- `api.ushly.example.com` for the backend and short-link redirects.

Caddy obtains and renews Let's Encrypt certificates and redirects HTTP to HTTPS.
The final names must be inserted consistently into frontend build variables,
canonical and Open Graph metadata, sitemap and robots output, backend CORS,
secure cookie settings, trusted-proxy configuration, and the Google OAuth
callback. A Route 53 hosted zone is optional; existing external DNS is cheaper
when already available. A domain purchase is outside this decision.

Do not deploy OAuth or authentication under a temporary hostname and later
change it without updating cookies, CORS, frontend metadata, and the registered
Google redirect URI together.

## Secrets and configuration

Store runtime secrets as encrypted AWS Systems Manager Parameter Store
`SecureString` values or inject them from a root-readable deployment environment
file with mode `0600`. Parameter Store is preferred. Grant the instance role
access only to the Ushly production parameter path.

Never place database passwords, Redis credentials, JWT secrets, IP-hash secrets,
OAuth client secrets, cookies, or access tokens in Git, images, Compose files,
user data, frontend `VITE_*` variables, or CI logs. Frontend `VITE_API_ORIGIN`
and `VITE_SITE_ORIGIN` are intentionally public build values. Generate separate
high-entropy values for each backend secret and keep `.env` files excluded from
image build contexts and source control.

## Backups and recovery

PostgreSQL and Redis on the same instance reduce cost but create one failure
domain. EBS is persistent across an ordinary instance stop/start but does not
replace backups.

The initial policy is:

1. Create encrypted EBS snapshots before releases and on a daily schedule.
2. Retain seven daily snapshots and four weekly snapshots while cost remains
   within budget.
3. Create a regular logical PostgreSQL dump, encrypt it, and store it in a
   private versioned S3 bucket with a short lifecycle policy.
4. Treat Redis as reconstructable cache and transient OAuth/rate-limit state;
   do not rely on Redis persistence for authoritative data.
5. Test restoration into a replacement volume and PostgreSQL container before
   describing the backup as usable.

The S3 bucket blocks all public access and grants only the deployment role the
minimum required object permissions. Backup size, snapshot growth, and restore
test results must be reviewed monthly.

## Budget controls

Before starting EC2:

1. Create an AWS Budget for USD 25 forecasted and actual monthly spend alerts.
2. Add alerts at USD 10, USD 20, and USD 25 to a verified maintainer email.
3. Create a separate zero-spend or very-low-spend alert for unexpected services.
4. Enable Free Tier and credit-balance notifications.
5. Review Cost Explorer weekly during the launch and tag every resource with
   `Project=Ushly`, `Environment=Portfolio`, and `Owner=<maintainer>`.

Budgets notify; they do not automatically stop resources. Automated shutdown is
kept separate because stopping the only production host without checking active
traffic can cause an outage.

## CI/CD and release procedure

GitHub Actions remains the verification gate. Pull requests run the existing
lint, type-check, tests, builds, and diff check without AWS credentials.

The initial deployment is deliberately manual:

1. Obtain explicit approval for the AWS account and exact resources.
2. Confirm the Pricing Calculator estimate, credit expiry, domain, region, and
   budget alerts.
3. Provision the instance, encrypted volume, Elastic IP, security group, IAM
   role, DNS, parameters, snapshots, and private backup bucket.
4. Install Docker Engine and the Compose plugin from trusted packages.
5. Check out a recorded release commit, retrieve runtime secrets without
   printing them, and build images with `docker compose build`.
6. Apply committed Prisma migrations with `prisma migrate deploy` before
   switching application containers.
7. Start PostgreSQL and Redis, then the backend, frontend, and Caddy. Wait for
   health checks before exposing the release.
8. Run bounded smoke tests for health, registration, login, refresh, logout,
   OAuth, links, redirects, QR codes, analytics, admin authorization, sitemap,
   robots, and responsive public pages.

After this process is stable, CI may deploy on a protected manual workflow using
GitHub OIDC and a narrowly scoped AWS role. Do not store long-lived AWS access
keys in GitHub. Production deployment still requires an approved environment,
branch protection, and the same smoke checks.

## Monitoring and shutdown

Use Docker health checks, the backend `/health/ready` endpoint, EC2 status checks,
and basic CloudWatch alarms for instance status, CPU, and estimated charges.
Install the CloudWatch agent only if memory, disk, and container log monitoring
are needed; set short log retention to control cost. Alert on low disk space,
repeated container restarts, and failed health checks.

For planned shutdown:

1. Announce maintenance and stop new deployments.
2. Take a PostgreSQL logical backup and EBS snapshot.
3. Stop application traffic, then stop the frontend/backend, Redis, and
   PostgreSQL containers cleanly.
4. Stop the EC2 instance and verify its state in the console.
5. Release the Elastic IP only when DNS and recovery plans no longer need it;
   an allocated idle public IPv4 address continues to incur charges.

Stopping EC2 avoids compute charges but EBS, snapshots, the Elastic IP, Route 53,
and S3 can continue to incur charges. Deleting the stack requires a separate
inventory and data-retention decision.

## Rollback procedure

1. Record every release commit and retain the previous application images on
   the host while disk space permits.
2. If a release fails before a migration, restore the previous image tags and
   Compose configuration, then verify all health checks.
3. Do not automatically reverse Prisma migrations. Keep migrations backward
   compatible so the previous application can run against the current schema.
4. For data corruption, stop writes and restore PostgreSQL from the most recent
   verified logical dump or an EBS snapshot attached to a replacement instance.
5. Recreate Redis when necessary; expect cache warm-up, reset rate limits, and
   interrupted OAuth attempts.
6. Restore DNS to the last known-good Elastic IP if a replacement host is used.
7. Re-run the release smoke tests and record the incident before resuming
   deployment.

## Upgrade path — not approved

Upgrade only after measurements or persistence requirements justify it:

1. Move the frontend to S3 and CloudFront.
2. Move PostgreSQL to RDS with automated backups, Multi-AZ only when its cost is
   justified, and RDS Proxy only when measured connection pressure requires it.
3. Move Redis to ElastiCache when shared cache availability and OAuth state
   continuity matter.
4. Move the application to a larger EC2 instance or ECS/Fargate and add an
   Application Load Balancer when horizontal scaling is required.
5. Split public and private subnets and add NAT only when private workloads have
   a demonstrated outbound-network requirement that justifies the fixed cost.
6. Add a separate staging account or environment with isolated data and secrets.

RDS, ElastiCache, load balancers, NAT Gateways, ECS, paid support, and additional
always-on environments are explicitly excluded from the initial decision.

## Approval boundary

This ADR recommends an architecture; it does not approve spending or execution.
Before any real AWS action, present the exact account plan, region, instance,
volume, IP, DNS, IAM policies, Parameter Store entries, backup resources, budget,
estimated monthly charge, credit expiry, and deletion procedure. Obtain explicit
approval before creating an account, credentials, infrastructure, domain, or
deployment.

## References

- [AWS Free Tier overview](https://aws.amazon.com/free/)
- [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- [Amazon EC2 On-Demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Amazon VPC public IPv4 pricing](https://aws.amazon.com/vpc/pricing/)
- [Amazon EBS pricing](https://aws.amazon.com/ebs/pricing/)
- [AWS Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
