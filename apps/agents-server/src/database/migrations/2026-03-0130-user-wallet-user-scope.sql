ALTER TABLE "prefix_UserWallet"
    ADD COLUMN IF NOT EXISTS "isUserScoped" BOOLEAN;

UPDATE "prefix_UserWallet"
SET "isUserScoped" = TRUE
WHERE "isUserScoped" IS NULL;

ALTER TABLE "prefix_UserWallet"
    ALTER COLUMN "isUserScoped" SET NOT NULL;

ALTER TABLE "prefix_UserWallet"
    ALTER COLUMN "isUserScoped" SET DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "prefix_UserWallet_isUserScoped_idx"
    ON "prefix_UserWallet" ("isUserScoped");

CREATE INDEX IF NOT EXISTS "prefix_UserWallet_scope_lookup_idx"
    ON "prefix_UserWallet" ("isUserScoped", "isGlobal", "agentPermanentId", "userId", "recordType", "service", "key");
