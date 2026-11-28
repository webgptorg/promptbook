ALTER TABLE "prefix_UserChatJob"
    ADD COLUMN IF NOT EXISTS "repliedToThreadId" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "repliedToMessageId" TEXT NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_chatId_repliedToMessageId_idx"
    ON "prefix_UserChatJob" ("chatId", "repliedToMessageId")
    WHERE "repliedToMessageId" IS NOT NULL;
