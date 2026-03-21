ALTER TABLE "prefix_UserChatTimeout"
    ADD COLUMN IF NOT EXISTS "recurrenceIntervalMs" BIGINT NULL,
    ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS "runCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lastFiredAt" TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_userId_agentPermanentId_status_dueAt_idx"
    ON "prefix_UserChatTimeout" ("userId", "agentPermanentId", "status", "dueAt" ASC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_pausedAt_idx"
    ON "prefix_UserChatTimeout" ("pausedAt")
    WHERE "pausedAt" IS NOT NULL;
