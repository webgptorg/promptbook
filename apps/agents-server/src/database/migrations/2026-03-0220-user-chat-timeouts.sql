CREATE TABLE IF NOT EXISTS "prefix_UserChatTimeout" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "chatId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "agentPermanentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "durationMs" BIGINT NOT NULL,
    "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "queuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "startedAt" TIMESTAMP WITH TIME ZONE NULL,
    "completedAt" TIMESTAMP WITH TIME ZONE NULL,
    "cancelRequestedAt" TIMESTAMP WITH TIME ZONE NULL,
    "leaseExpiresAt" TIMESTAMP WITH TIME ZONE NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT NULL,
    CONSTRAINT "prefix_UserChatTimeout_chatId_fkey"
        FOREIGN KEY ("chatId")
        REFERENCES "prefix_UserChat"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatTimeout_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "prefix_User"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatTimeout_agentPermanentId_fkey"
        FOREIGN KEY ("agentPermanentId")
        REFERENCES "prefix_Agent"("permanentId")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatTimeout_status_check"
        CHECK ("status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_status_dueAt_idx"
    ON "prefix_UserChatTimeout" ("status", "dueAt" ASC, "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_chatId_status_dueAt_idx"
    ON "prefix_UserChatTimeout" ("chatId", "status", "dueAt" ASC, "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_userId_agentPermanentId_idx"
    ON "prefix_UserChatTimeout" ("userId", "agentPermanentId");
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_chatId_completedAt_idx"
    ON "prefix_UserChatTimeout" ("chatId", "completedAt" DESC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_running_startedAt_idx"
    ON "prefix_UserChatTimeout" ("startedAt" DESC)
    WHERE "status" = 'RUNNING';
CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_failed_completedAt_idx"
    ON "prefix_UserChatTimeout" ("completedAt" DESC)
    WHERE "status" = 'FAILED';

ALTER TABLE "prefix_UserChatTimeout" ENABLE ROW LEVEL SECURITY;
