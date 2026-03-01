-- Chat Streaming Execution Table
-- Tracks active and completed streaming executions for browser-independent chat

CREATE TABLE IF NOT EXISTS "prefix_ChatStreamingExecution" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "completedAt" TIMESTAMP WITH TIME ZONE NULL,
    "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    "userId" BIGINT NULL,
    "userChatId" TEXT NULL,
    "agentPermanentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentHash" TEXT NOT NULL,
    "userMessage" JSONB NOT NULL,
    "assistantMessage" JSONB NULL,
    "assistantMessageDelta" TEXT NOT NULL DEFAULT '',
    "toolCalls" JSONB NULL,
    "usage" JSONB NULL,
    "error" JSONB NULL,
    "userMessageHash" TEXT NULL,
    "assistantMessageHash" TEXT NULL,
    CONSTRAINT "prefix_ChatStreamingExecution_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "prefix_User"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_ChatStreamingExecution_userChatId_fkey"
        FOREIGN KEY ("userChatId")
        REFERENCES "prefix_UserChat"("id")
        ON DELETE SET NULL,
    CONSTRAINT "prefix_ChatStreamingExecution_agentPermanentId_fkey"
        FOREIGN KEY ("agentPermanentId")
        REFERENCES "prefix_Agent"("permanentId")
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "prefix_ChatStreamingExecution_userId_idx"
    ON "prefix_ChatStreamingExecution" ("userId");
CREATE INDEX IF NOT EXISTS "prefix_ChatStreamingExecution_userChatId_idx"
    ON "prefix_ChatStreamingExecution" ("userChatId");
CREATE INDEX IF NOT EXISTS "prefix_ChatStreamingExecution_status_idx"
    ON "prefix_ChatStreamingExecution" ("status");
CREATE INDEX IF NOT EXISTS "prefix_ChatStreamingExecution_createdAt_idx"
    ON "prefix_ChatStreamingExecution" ("createdAt" DESC);

ALTER TABLE "prefix_ChatStreamingExecution" ENABLE ROW LEVEL SECURITY;
