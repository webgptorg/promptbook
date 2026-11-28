CREATE TABLE IF NOT EXISTS "prefix_UserPushSubscription" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "userId" BIGINT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT NULL,
    "isChatFocused" BOOLEAN NOT NULL DEFAULT false,
    "focusedAgentPermanentId" TEXT NULL,
    "focusedChatId" TEXT NULL,
    "focusUpdatedAt" TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT "prefix_UserPushSubscription_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "prefix_User"("id")
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "prefix_UserPushSubscription_endpoint_key"
    ON "prefix_UserPushSubscription" ("endpoint");
CREATE INDEX IF NOT EXISTS "prefix_UserPushSubscription_userId_idx"
    ON "prefix_UserPushSubscription" ("userId");
CREATE INDEX IF NOT EXISTS "prefix_UserPushSubscription_userId_focusUpdatedAt_idx"
    ON "prefix_UserPushSubscription" ("userId", "focusUpdatedAt" DESC);

ALTER TABLE "prefix_UserPushSubscription" ENABLE ROW LEVEL SECURITY;
