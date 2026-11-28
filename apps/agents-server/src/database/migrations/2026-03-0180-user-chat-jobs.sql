CREATE TABLE IF NOT EXISTS "prefix_UserChatJob" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "chatId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "agentPermanentId" TEXT NOT NULL,
    "userMessageId" TEXT NOT NULL,
    "assistantMessageId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "queuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "startedAt" TIMESTAMP WITH TIME ZONE NULL,
    "completedAt" TIMESTAMP WITH TIME ZONE NULL,
    "cancelRequestedAt" TIMESTAMP WITH TIME ZONE NULL,
    "lastHeartbeatAt" TIMESTAMP WITH TIME ZONE NULL,
    "leaseExpiresAt" TIMESTAMP WITH TIME ZONE NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NULL,
    "failureReason" TEXT NULL,
    CONSTRAINT "prefix_UserChatJob_chatId_fkey"
        FOREIGN KEY ("chatId")
        REFERENCES "prefix_UserChat"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatJob_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "prefix_User"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatJob_agentPermanentId_fkey"
        FOREIGN KEY ("agentPermanentId")
        REFERENCES "prefix_Agent"("permanentId")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChatJob_status_check"
        CHECK ("status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_status_queuedAt_idx"
    ON "prefix_UserChatJob" ("status", "queuedAt" ASC, "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_chatId_createdAt_idx"
    ON "prefix_UserChatJob" ("chatId", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_userId_agentPermanentId_idx"
    ON "prefix_UserChatJob" ("userId", "agentPermanentId");
CREATE UNIQUE INDEX IF NOT EXISTS "prefix_UserChatJob_chatId_clientMessageId_key"
    ON "prefix_UserChatJob" ("chatId", "clientMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "prefix_UserChatJob_running_per_chat_key"
    ON "prefix_UserChatJob" ("chatId")
    WHERE "status" = 'RUNNING';

ALTER TABLE "prefix_UserChatJob" ENABLE ROW LEVEL SECURITY;
