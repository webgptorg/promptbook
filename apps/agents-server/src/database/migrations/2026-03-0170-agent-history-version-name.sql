-- Allow optional human-readable names for Agent history snapshots.
ALTER TABLE "prefix_AgentHistory"
    ADD COLUMN IF NOT EXISTS "versionName" TEXT;

-- Keep named-only history filtering fast.
CREATE INDEX IF NOT EXISTS "prefix_AgentHistory_permanentId_named_createdAt_idx"
    ON "prefix_AgentHistory" ("permanentId", "createdAt" DESC)
    WHERE "versionName" IS NOT NULL;
