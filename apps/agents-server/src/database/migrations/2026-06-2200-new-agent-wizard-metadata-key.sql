UPDATE "prefix_Metadata"
SET "key" = 'NEW_AGENT_WIZARD',
    "note" = 'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD, MANGO_WIZARD.',
    "updatedAt" = NOW()
WHERE "key" = 'NEW_AGENT_' || 'WIZ' || 'ZARD'
  AND NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'NEW_AGENT_WIZARD');

DELETE FROM "prefix_Metadata"
WHERE "key" = 'NEW_AGENT_' || 'WIZ' || 'ZARD';

INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'NEW_AGENT_WIZARD',
       'MANGO_WIZARD',
       'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD, MANGO_WIZARD.',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'NEW_AGENT_WIZARD');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN REPLACE(REPLACE(UPPER(TRIM(COALESCE("value", ''))), ' ', '_'), '-', '_') IN ('BOILERPLATE', 'WIZARD', 'MANGO_WIZARD')
                      THEN REPLACE(REPLACE(UPPER(TRIM("value")), ' ', '_'), '-', '_')
                  ELSE 'MANGO_WIZARD'
              END,
    "note" = 'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD, MANGO_WIZARD.',
    "updatedAt" = NOW()
WHERE "key" = 'NEW_AGENT_WIZARD';
