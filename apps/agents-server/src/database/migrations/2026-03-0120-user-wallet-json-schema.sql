ALTER TABLE "prefix_UserWallet"
    ADD COLUMN IF NOT EXISTS "jsonSchema" JSONB NULL;
