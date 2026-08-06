ALTER TABLE "prefix_UserChat"
DROP CONSTRAINT IF EXISTS "prefix_UserChat_source_check";

ALTER TABLE "prefix_UserChat"
ADD CONSTRAINT "prefix_UserChat_source_check"
CHECK ("source" IN ('WEB_UI', 'OPENAI_API', 'TEAM_MEMBER', 'EMAIL', 'AGENT_GOAL'));

CREATE INDEX IF NOT EXISTS "prefix_UserChat_agentPermanentId_goalSource_idx"
    ON "prefix_UserChat" ("agentPermanentId")
    WHERE "source" = 'AGENT_GOAL';
