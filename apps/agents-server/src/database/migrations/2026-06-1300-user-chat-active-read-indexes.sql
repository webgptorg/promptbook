CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_chatId_userId_agentPermanentId_active_createdAt_idx"
    ON "prefix_UserChatJob" ("chatId", "userId", "agentPermanentId", "createdAt" ASC)
    WHERE "status" IN ('QUEUED', 'RUNNING');

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_chatId_userId_agentPermanentId_active_dueAt_idx"
    ON "prefix_UserChatTimeout" ("chatId", "userId", "agentPermanentId", "dueAt" ASC, "createdAt" ASC)
    WHERE "status" IN ('QUEUED', 'RUNNING') AND "pausedAt" IS NULL;
