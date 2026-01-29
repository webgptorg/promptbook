-- Add status column to track file upload progress
ALTER TABLE "prefix_File" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'COMPLETED';

-- Add check constraint for valid status values
-- ALTER TABLE "prefix_File" ADD CONSTRAINT "File_status_check" CHECK ("status" IN ('UPLOADING', 'COMPLETED', 'FAILED'));

-- Drop the column cdnUrl if it exists
ALTER TABLE "prefix_File" DROP COLUMN IF EXISTS "cdnUrl";


-- Add nullable columns storageUrl and shortUrl 
ALTER TABLE "prefix_File" ADD COLUMN IF NOT EXISTS "storageUrl" TEXT NULL;
ALTER TABLE "prefix_File" ADD COLUMN IF NOT EXISTS "shortUrl" TEXT NULL;