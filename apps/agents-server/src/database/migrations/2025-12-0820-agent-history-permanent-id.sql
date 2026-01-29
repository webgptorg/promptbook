-- Backfill permanentId in Agent table if missing
UPDATE "prefix_Agent"
SET "permanentId" = gen_random_uuid()::text
WHERE "permanentId" IS NULL;

-- Add permanentId column to AgentHistory
ALTER TABLE "prefix_AgentHistory" ADD COLUMN "permanentId" TEXT;

-- Backfill permanentId from Agent table
UPDATE "prefix_AgentHistory" ah
SET "permanentId" = a."permanentId"
FROM "prefix_Agent" a
WHERE ah."agentName" = a."agentName";

-- Make permanentId NOT NULL
ALTER TABLE "prefix_AgentHistory" ALTER COLUMN "permanentId" SET NOT NULL;

-- Drop old foreign key on agentName
ALTER TABLE "prefix_AgentHistory" DROP CONSTRAINT "prefix_AgentHistory_agentName_fkey";

-- Add new foreign key on permanentId referencing Agent(permanentId)
ALTER TABLE "prefix_AgentHistory"
    ADD CONSTRAINT "prefix_AgentHistory_permanentId_fkey"
    FOREIGN KEY ("permanentId")
    REFERENCES "prefix_Agent"("permanentId")
    ON DELETE CASCADE;

-- Add index for permanentId
CREATE INDEX "prefix_AgentHistory_permanentId_idx" ON "prefix_AgentHistory" ("permanentId");
