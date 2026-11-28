-- Link recorded chat-history messages to canonical durable chats and their chat-completion tasks
-- Backwards compatible: only adds new nullable columns, older servers keep working unchanged
ALTER TABLE "prefix_ChatHistory" ADD COLUMN IF NOT EXISTS "chatId" TEXT NULL;
ALTER TABLE "prefix_ChatHistory" ADD COLUMN IF NOT EXISTS "taskId" TEXT NULL;

COMMENT ON COLUMN "prefix_ChatHistory"."chatId" IS 'The id of the canonical `UserChat` this message belongs to, `NULL` for legacy stateless chats';
COMMENT ON COLUMN "prefix_ChatHistory"."taskId" IS 'The id of the durable `UserChatJob` (chat-completion task) which produced or was queued by this message';

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_chatId_idx" ON "prefix_ChatHistory" ("chatId");
CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_taskId_idx" ON "prefix_ChatHistory" ("taskId");
