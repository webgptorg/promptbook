ALTER TABLE "prefix_ApiTokens"
    ADD COLUMN IF NOT EXISTS "userId" BIGINT NULL;

ALTER TABLE "prefix_ApiTokens"
    DROP CONSTRAINT IF EXISTS "prefix_ApiTokens_userId_fkey",
    ADD CONSTRAINT "prefix_ApiTokens_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "prefix_User"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "prefix_ApiTokens_userId_idx" ON "prefix_ApiTokens" ("userId");

ALTER TABLE "prefix_Agent"
    ADD COLUMN IF NOT EXISTS "userId" BIGINT NULL;

ALTER TABLE "prefix_Agent"
    DROP CONSTRAINT IF EXISTS "prefix_Agent_userId_fkey",
    ADD CONSTRAINT "prefix_Agent_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "prefix_User"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "prefix_Agent_userId_idx" ON "prefix_Agent" ("userId");

ALTER TABLE "prefix_AgentFolder"
    ADD COLUMN IF NOT EXISTS "userId" BIGINT NULL;

ALTER TABLE "prefix_AgentFolder"
    DROP CONSTRAINT IF EXISTS "prefix_AgentFolder_userId_fkey",
    ADD CONSTRAINT "prefix_AgentFolder_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "prefix_User"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "prefix_AgentFolder_userId_idx" ON "prefix_AgentFolder" ("userId");

DROP INDEX IF EXISTS "prefix_AgentFolder_parent_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "prefix_AgentFolder_parent_name_key"
    ON "prefix_AgentFolder" (COALESCE("userId", 0), COALESCE("parentId", 0), "name")
    WHERE "deletedAt" IS NULL;

WITH "fallbackUser" AS (
    SELECT "id"
    FROM "prefix_User"
    ORDER BY "isAdmin" DESC, "createdAt" ASC, "id" ASC
    LIMIT 1
)
UPDATE "prefix_ApiTokens"
SET "userId" = (SELECT "id" FROM "fallbackUser")
WHERE "userId" IS NULL
  AND EXISTS (SELECT 1 FROM "fallbackUser");

WITH "fallbackUser" AS (
    SELECT "id"
    FROM "prefix_User"
    ORDER BY "isAdmin" DESC, "createdAt" ASC, "id" ASC
    LIMIT 1
)
UPDATE "prefix_Agent"
SET "userId" = (SELECT "id" FROM "fallbackUser")
WHERE "userId" IS NULL
  AND EXISTS (SELECT 1 FROM "fallbackUser");

WITH "fallbackUser" AS (
    SELECT "id"
    FROM "prefix_User"
    ORDER BY "isAdmin" DESC, "createdAt" ASC, "id" ASC
    LIMIT 1
)
UPDATE "prefix_AgentFolder"
SET "userId" = (SELECT "id" FROM "fallbackUser")
WHERE "userId" IS NULL
  AND EXISTS (SELECT 1 FROM "fallbackUser");
