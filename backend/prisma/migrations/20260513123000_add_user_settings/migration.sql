-- Add user settings JSON field for role-specific preferences
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}'::jsonb;
