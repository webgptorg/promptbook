CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_running_startedAt_idx"
    ON "prefix_UserChatJob" ("startedAt" DESC)
    WHERE "status" = 'RUNNING';

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_failed_completedAt_idx"
    ON "prefix_UserChatJob" ("completedAt" DESC)
    WHERE "status" = 'FAILED';

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_agentPermanentId_idx"
    ON "prefix_UserChatJob" ("agentPermanentId");

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_updatedAt_idx"
    ON "prefix_UserChatJob" ("updatedAt" DESC);
