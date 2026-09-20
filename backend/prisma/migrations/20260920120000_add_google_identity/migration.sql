BEGIN;
-- Lock legacy mappings through validation and backfill. Never guess an identity.
LOCK TABLE "User" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE (provider = 'google' AND (
      "providerId" IS NULL OR "providerId" !~ '^[!-~]{1,255}$'
      OR email <> lower(btrim(email)) OR length(email) > 254
      OR "passwordHash" IS NOT NULL
    )) OR (provider = 'local' AND "providerId" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Inconsistent legacy Google mappings; review records before migration';
  END IF;
END $$;
CREATE TABLE "UserIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "providerId" VARCHAR(255) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserIdentity_google_only" CHECK (provider = 'google'),
  CONSTRAINT "UserIdentity_subject_valid" CHECK ("providerId" ~ '^[!-~]{1,255}$'),
  CONSTRAINT "UserIdentity_email_normalized" CHECK (email = lower(btrim(email)) AND email <> ''),
  CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserIdentity_provider_providerId_key" ON "UserIdentity"("provider", "providerId");
CREATE UNIQUE INDEX "UserIdentity_userId_provider_key" ON "UserIdentity"("userId", "provider");
INSERT INTO "UserIdentity" ("id", "userId", "provider", "providerId", "email")
SELECT 'google-backfill-' || id, id, provider, "providerId", email FROM "User" WHERE provider = 'google';
COMMIT;
