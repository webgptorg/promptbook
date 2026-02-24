-- Add securityResult column to File table to track security check results
ALTER TABLE "prefix_File" ADD COLUMN "securityResult" JSONB;

COMMENT ON COLUMN "prefix_File"."securityResult" IS 'Result of the security check (virus scan, etc.)';
