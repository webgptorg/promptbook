-- Normalize AgentHistory permanent-id storage across legacy schemas.
-- Some deployments still use legacy "agentId" instead of "permanentId",
-- which silently breaks history inserts in the current code.

-- Ensure every agent has a permanent id.
UPDATE "prefix_Agent"
SET "permanentId" = gen_random_uuid()::text
WHERE "permanentId" IS NULL;

-- Ensure AgentHistory has permanentId.
ALTER TABLE "prefix_AgentHistory" ADD COLUMN IF NOT EXISTS "permanentId" TEXT;

-- Copy values from legacy "agentId" column when present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'prefix_AgentHistory'
          AND column_name = 'agentId'
    ) THEN
        EXECUTE 'UPDATE "prefix_AgentHistory" SET "permanentId" = COALESCE("permanentId", "agentId")';
    END IF;
END
$$;

-- Backfill remaining permanentId values from Agent rows by legacy agentName link.
UPDATE "prefix_AgentHistory" ah
SET "permanentId" = a."permanentId"
FROM "prefix_Agent" a
WHERE ah."permanentId" IS NULL
  AND ah."agentName" = a."agentName";

-- Ensure every agent has at least one history snapshot.
INSERT INTO "prefix_AgentHistory" (
    "createdAt",
    "agentName",
    "permanentId",
    "agentHash",
    "previousAgentHash",
    "agentSource",
    "promptbookEngineVersion"
)
SELECT
    COALESCE(a."updatedAt", a."createdAt", now()),
    a."agentName",
    a."permanentId",
    a."agentHash",
    NULL,
    a."agentSource",
    a."promptbookEngineVersion"
FROM "prefix_Agent" a
WHERE a."permanentId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "prefix_AgentHistory" ah
      WHERE ah."permanentId" = a."permanentId"
  );

-- Drop old or inconsistent constraints before adding the canonical one.
ALTER TABLE "prefix_AgentHistory" DROP CONSTRAINT IF EXISTS "prefix_AgentHistory_agentName_fkey";
ALTER TABLE "prefix_AgentHistory" DROP CONSTRAINT IF EXISTS "prefix_AgentHistory_agentId_fkey";
ALTER TABLE "prefix_AgentHistory" DROP CONSTRAINT IF EXISTS "prefix_AgentHistory_permanentId_fkey";

-- Drop legacy column once values are copied.
ALTER TABLE "prefix_AgentHistory" DROP COLUMN IF EXISTS "agentId";

-- Remove orphan rows that still have no permanentId after backfill.
DELETE FROM "prefix_AgentHistory"
WHERE "permanentId" IS NULL;

-- Enforce permanentId integrity.
ALTER TABLE "prefix_AgentHistory" ALTER COLUMN "permanentId" SET NOT NULL;

ALTER TABLE "prefix_AgentHistory"
    ADD CONSTRAINT "prefix_AgentHistory_permanentId_fkey"
    FOREIGN KEY ("permanentId")
    REFERENCES "prefix_Agent"("permanentId")
    ON DELETE CASCADE;

-- Keep history lookup fast for editor history UI.
CREATE INDEX IF NOT EXISTS "prefix_AgentHistory_permanentId_idx" ON "prefix_AgentHistory" ("permanentId");
CREATE INDEX IF NOT EXISTS "prefix_AgentHistory_permanentId_createdAt_idx"
    ON "prefix_AgentHistory" ("permanentId", "createdAt" DESC);
