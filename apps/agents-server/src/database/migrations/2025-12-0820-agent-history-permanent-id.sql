-- Backfill permanentId in Agent table if missing
UPDATE "prefix_Agent"
SET "permanentId" = gen_random_uuid()::text
WHERE "permanentId" IS NULL;

-- Add agentId column to AgentHistory
ALTER TABLE "prefix_AgentHistory" ADD COLUMN "agentId" TEXT;

-- Backfill agentId from Agent table
UPDATE "prefix_AgentHistory" ah
SET "agentId" = a."permanentId"
FROM "prefix_Agent" a
WHERE ah."agentName" = a."agentName";

-- Make agentId NOT NULL
ALTER TABLE "prefix_AgentHistory" ALTER COLUMN "agentId" SET NOT NULL;

-- Drop old foreign key on agentName
ALTER TABLE "prefix_AgentHistory" DROP CONSTRAINT "prefix_AgentHistory_agentName_fkey";

-- Add new foreign key on agentId referencing Agent(permanentId)
ALTER TABLE "prefix_AgentHistory"
    ADD CONSTRAINT "prefix_AgentHistory_agentId_fkey"
    FOREIGN KEY ("agentId")
    REFERENCES "prefix_Agent"("permanentId")
    ON DELETE CASCADE;

-- Add index for agentId
CREATE INDEX "prefix_AgentHistory_agentId_idx" ON "prefix_AgentHistory" ("agentId");
