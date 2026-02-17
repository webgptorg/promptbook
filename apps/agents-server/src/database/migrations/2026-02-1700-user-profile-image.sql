ALTER TABLE "prefix_User"
    ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT NULL;

COMMENT ON COLUMN "prefix_User"."profileImageUrl" IS 'Optional image URL used for the user avatar displayed in the header.';
