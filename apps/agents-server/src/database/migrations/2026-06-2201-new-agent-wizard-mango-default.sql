UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN REPLACE(REPLACE(UPPER(TRIM(COALESCE("value", ''))), ' ', '_'), '-', '_') = 'BOILERPLATE'
                      THEN 'MANGO_WIZARD'
                  WHEN REPLACE(REPLACE(UPPER(TRIM(COALESCE("value", ''))), ' ', '_'), '-', '_') IN ('WIZARD', 'MANGO_WIZARD')
                      THEN REPLACE(REPLACE(UPPER(TRIM("value")), ' ', '_'), '-', '_')
                  ELSE 'MANGO_WIZARD'
              END,
    "note" = 'Controls the "new agent" flow. Allowed values: BOILERPLATE, WIZARD, MANGO_WIZARD.',
    "updatedAt" = NOW()
WHERE "key" = 'NEW_AGENT_WIZARD';
