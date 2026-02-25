ALTER TABLE "prefix_ChatHistory"
    ADD COLUMN IF NOT EXISTS "userId" BIGINT NULL;

ALTER TABLE "prefix_ChatHistory"
    DROP CONSTRAINT IF EXISTS "prefix_ChatHistory_userId_fkey",
    ADD CONSTRAINT "prefix_ChatHistory_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "prefix_User"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_userId_idx"
    ON "prefix_ChatHistory" ("userId");

CREATE INDEX IF NOT EXISTS "prefix_ChatHistory_userId_createdAt_idx"
    ON "prefix_ChatHistory" ("userId", "createdAt");

COMMENT ON COLUMN "prefix_ChatHistory"."userId"
    IS 'Optional user id tied to the chat call, including anonymous users resolved from browser cookies.';
