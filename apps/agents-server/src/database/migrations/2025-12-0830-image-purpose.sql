ALTER TABLE "prefix_Image" ADD COLUMN "agentId" BIGINT REFERENCES "prefix_Agent"("id") ON DELETE CASCADE;
ALTER TABLE "prefix_Image" ADD COLUMN "purpose" TEXT CHECK ("purpose" IN ('AVATAR', 'TESTING'));

COMMENT ON COLUMN "prefix_Image"."agentId" IS 'The agent this image belongs to (nullable for testing images)';
COMMENT ON COLUMN "prefix_Image"."purpose" IS 'The purpose of the image (AVATAR or TESTING)';
