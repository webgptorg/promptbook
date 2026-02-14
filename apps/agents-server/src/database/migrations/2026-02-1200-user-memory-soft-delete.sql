ALTER TABLE "prefix_UserMemory"
    ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserMemory_userId_deletedAt_idx"
    ON "prefix_UserMemory" ("userId", "deletedAt");
