-- Keep agent-scoped wallet/integration records compatible with legacy agent rows.
-- Older server versions can still omit "permanentId", so backfill existing rows
-- and let PostgreSQL generate one when the column is not provided.

UPDATE "prefix_Agent"
SET "permanentId" = gen_random_uuid()::text
WHERE "permanentId" IS NULL;

ALTER TABLE "prefix_Agent"
    ALTER COLUMN "permanentId" SET DEFAULT gen_random_uuid()::text;
