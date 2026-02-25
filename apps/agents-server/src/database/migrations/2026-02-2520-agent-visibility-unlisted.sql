ALTER TABLE "prefix_Agent" DROP CONSTRAINT IF EXISTS "prefix_Agent_visibility_check";
ALTER TABLE "prefix_Agent" ALTER COLUMN "visibility" SET DEFAULT 'UNLISTED';
ALTER TABLE "prefix_Agent"
    ADD CONSTRAINT "prefix_Agent_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'PRIVATE', 'UNLISTED'));

UPDATE "prefix_Metadata"
SET "key" = 'DEFAULT_VISIBILITY',
    "updatedAt" = NOW()
WHERE "key" = 'DEFAULT_AGENT_VISIBILITY'
  AND NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'DEFAULT_VISIBILITY');

DELETE FROM "prefix_Metadata"
WHERE "key" = 'DEFAULT_AGENT_VISIBILITY';

INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'DEFAULT_VISIBILITY',
       'UNLISTED',
       'Default visibility for new agents. Can be PRIVATE, UNLISTED, or PUBLIC.',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'DEFAULT_VISIBILITY');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN UPPER(TRIM("value")) IN ('PRIVATE', 'UNLISTED', 'PUBLIC') THEN UPPER(TRIM("value"))
                  ELSE 'UNLISTED'
    END,
    "note" = 'Default visibility for new agents. Can be PRIVATE, UNLISTED, or PUBLIC.',
    "updatedAt" = NOW()
WHERE "key" = 'DEFAULT_VISIBILITY';
