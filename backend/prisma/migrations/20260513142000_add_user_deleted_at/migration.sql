-- Add soft delete marker to retain accounts for recovery and auditability
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);