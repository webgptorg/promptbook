INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'DEFAULT_THEME',
       'SYSTEM',
       'Default theme mode for browsers without a saved preference. Allowed values: SYSTEM, LIGHT, DARK.',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'DEFAULT_THEME');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN UPPER(COALESCE("value", '')) IN ('SYSTEM', 'LIGHT', 'DARK') THEN UPPER("value")
                  ELSE 'SYSTEM'
              END,
    "note" = 'Default theme mode for browsers without a saved preference. Allowed values: SYSTEM, LIGHT, DARK.',
    "updatedAt" = NOW()
WHERE "key" = 'DEFAULT_THEME';
