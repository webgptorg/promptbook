UPDATE "prefix_Metadata"
SET "key" = 'NEW_AGENT_WIZARD',
    "note" = 'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD.',
    "updatedAt" = NOW()
WHERE "key" = 'NEW_AGENT_' || 'WIZ' || 'ZARD'
  AND NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'NEW_AGENT_WIZARD');

DELETE FROM "prefix_Metadata"
WHERE "key" = 'NEW_AGENT_' || 'WIZ' || 'ZARD';

INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'NEW_AGENT_WIZARD',
       'BOILERPLATE',
       'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD.',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'NEW_AGENT_WIZARD');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN UPPER(TRIM(COALESCE("value", ''))) IN ('BOILERPLATE', 'WIZARD') THEN UPPER(TRIM("value"))
                  ELSE 'BOILERPLATE'
              END,
    "note" = 'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD.',
    "updatedAt" = NOW()
WHERE "key" = 'NEW_AGENT_WIZARD';
