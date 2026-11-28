CREATE INDEX IF NOT EXISTS "prefix_UserChat_userId_agentPermanentId_source_lastMessageAt_updatedAt_idx"
    ON "prefix_UserChat" ("userId", "agentPermanentId", "source", "lastMessageAt" DESC, "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_ready_queue_idx"
    ON "prefix_UserChatJob" ("queuedAt" ASC, "createdAt" ASC)
    WHERE "status" = 'QUEUED' AND "cancelRequestedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_running_leaseExpiresAt_idx"
    ON "prefix_UserChatJob" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING' AND "leaseExpiresAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_ready_dueAt_idx"
    ON "prefix_UserChatTimeout" ("dueAt" ASC, "createdAt" ASC)
    WHERE "status" = 'QUEUED' AND "cancelRequestedAt" IS NULL AND "pausedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_running_leaseExpiresAt_idx"
    ON "prefix_UserChatTimeout" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING' AND "leaseExpiresAt" IS NOT NULL;
