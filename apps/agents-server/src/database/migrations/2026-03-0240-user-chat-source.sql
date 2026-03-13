ALTER TABLE "prefix_UserChat"
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'WEB_UI';

ALTER TABLE "prefix_UserChat"
DROP CONSTRAINT IF EXISTS "prefix_UserChat_source_check";

ALTER TABLE "prefix_UserChat"
ADD CONSTRAINT "prefix_UserChat_source_check"
CHECK ("source" IN ('WEB_UI', 'OPENAI_API', 'TEAM_MEMBER'));

CREATE INDEX IF NOT EXISTS "prefix_UserChat_agentPermanentId_source_lastMessageAt_idx"
    ON "prefix_UserChat" ("agentPermanentId", "source", "lastMessageAt" DESC, "updatedAt" DESC);
