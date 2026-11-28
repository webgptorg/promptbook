ALTER TABLE "prefix_UserChatJob"
    ADD COLUMN IF NOT EXISTS "failureDetails" TEXT NULL;
