-- Drop old foreign keys on agentName first because they depend on unique agentName constraint/index
ALTER TABLE "prefix_ChatHistory" DROP CONSTRAINT IF EXISTS "prefix_ChatHistory_agentName_fkey";
ALTER TABLE "prefix_ChatFeedback" DROP CONSTRAINT IF EXISTS "prefix_ChatFeedback_agentName_fkey";

-- Remove unique constraint on agentName to allow duplicate names
ALTER TABLE "prefix_Agent" DROP CONSTRAINT IF EXISTS "prefix_agent_agentname_key";

-- Fallback for setups where unique key exists only as index
DROP INDEX IF EXISTS "prefix_agent_agentname_key";

-- Create a non-unique index on agentName for faster lookup by name
CREATE INDEX IF NOT EXISTS "prefix_Agent_agentName_idx" ON "prefix_Agent" ("agentName");

-- Ensure ChatHistory uses permanentId for foreign keys instead of agentName
ALTER TABLE "prefix_ChatHistory" ADD COLUMN IF NOT EXISTS "agentPermanentId" TEXT;

-- Backfill agentPermanentId from Agent table for ChatHistory
UPDATE "prefix_ChatHistory" ch
SET "agentPermanentId" = a."permanentId"
FROM "prefix_Agent" a
WHERE ch."agentName" = a."agentName"
AND ch."agentPermanentId" IS NULL;

-- Add new foreign key on agentPermanentId for ChatHistory
ALTER TABLE "prefix_ChatHistory"
    ADD CONSTRAINT "prefix_ChatHistory_agentPermanentId_fkey"
    FOREIGN KEY ("agentPermanentId")
    REFERENCES "prefix_Agent" ("permanentId")
    ON DELETE CASCADE;

-- Create index for agentPermanentId in ChatHistory
CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_agentPermanentId_idx" ON "prefix_ChatHistory" ("agentPermanentId");

-- Ensure ChatFeedback uses permanentId for foreign keys instead of agentName
ALTER TABLE "prefix_ChatFeedback" ADD COLUMN IF NOT EXISTS "agentPermanentId" TEXT;

-- Backfill agentPermanentId from Agent table for ChatFeedback
UPDATE "prefix_ChatFeedback" cf
SET "agentPermanentId" = a."permanentId"
FROM "prefix_Agent" a
WHERE cf."agentName" = a."agentName"
AND cf."agentPermanentId" IS NULL;

-- Add new foreign key on agentPermanentId for ChatFeedback
ALTER TABLE "prefix_ChatFeedback"
    ADD CONSTRAINT "prefix_ChatFeedback_agentPermanentId_fkey"
    FOREIGN KEY ("agentPermanentId")
    REFERENCES "prefix_Agent" ("permanentId")
    ON DELETE CASCADE;

-- Create index for agentPermanentId in ChatFeedback
CREATE INDEX IF NOT EXISTS "prefix_ChatFeedback_agentPermanentId_idx" ON "prefix_ChatFeedback" ("agentPermanentId");

-- Note: We keep the agentName columns in these tables for historical/caching purposes
-- but they are no longer the primary foreign key reference.
