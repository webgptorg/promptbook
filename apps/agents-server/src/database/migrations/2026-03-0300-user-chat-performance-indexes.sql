CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_active_chat_scope_createdAt_idx"
    ON "prefix_UserChatJob" ("chatId", "userId", "agentPermanentId", "createdAt" ASC)
    WHERE "status" IN ('QUEUED', 'RUNNING');

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_running_leaseExpiresAt_idx"
    ON "prefix_UserChatJob" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING';

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_active_chat_scope_dueAt_idx"
    ON "prefix_UserChatTimeout" ("chatId", "userId", "agentPermanentId", "dueAt" ASC, "createdAt" ASC)
    WHERE "status" IN ('QUEUED', 'RUNNING')
      AND "pausedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_running_leaseExpiresAt_idx"
    ON "prefix_UserChatTimeout" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING';
