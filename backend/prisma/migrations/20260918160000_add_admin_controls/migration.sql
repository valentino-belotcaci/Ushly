ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_audit_created_at_idx" ON "AdminAuditEvent"("createdAt", "id");
CREATE INDEX "admin_audit_target_idx" ON "AdminAuditEvent"("targetType", "targetId", "createdAt");
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
