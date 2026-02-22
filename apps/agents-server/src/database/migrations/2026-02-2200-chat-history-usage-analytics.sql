ALTER TABLE "prefix_ChatHistory"
    ADD COLUMN IF NOT EXISTS "actorType" TEXT;

ALTER TABLE "prefix_ChatHistory"
    DROP CONSTRAINT IF EXISTS "prefix_ChatHistory_actorType_check",
    ADD CONSTRAINT "prefix_ChatHistory_actorType_check"
    CHECK ("actorType" IS NULL OR "actorType" IN ('ANONYMOUS', 'TEAM_MEMBER', 'API_KEY'));

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_createdAt_idx"
    ON "prefix_ChatHistory" ("createdAt");

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_agentName_createdAt_idx"
    ON "prefix_ChatHistory" ("agentName", "createdAt");

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_source_createdAt_idx"
    ON "prefix_ChatHistory" ("source", "createdAt");

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_actorType_createdAt_idx"
    ON "prefix_ChatHistory" ("actorType", "createdAt");

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_apiKey_createdAt_idx"
    ON "prefix_ChatHistory" ("apiKey", "createdAt");
