INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'DEFAULT_AGENT_AVATAR_VISUAL',
       'OCTOPUS3D3',
       'Default built-in avatar visual used for agents without `META IMAGE` or `META AVATAR`. Allowed values: PIXEL_ART, OCTOPUS, OCTOPUS2, OCTOPUS3, OCTOPUS3D, OCTOPUS3D2, OCTOPUS3D3, ASCII_OCTOPUS, MINECRAFT, MINECRAFT2, FRACTAL, ORB.',
       NOW(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'DEFAULT_AGENT_AVATAR_VISUAL');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN UPPER(COALESCE("value", '')) = 'OCTOPUS3' THEN 'OCTOPUS3D3'
                  ELSE "value"
              END,
    "note" = 'Default built-in avatar visual used for agents without `META IMAGE` or `META AVATAR`. Allowed values: PIXEL_ART, OCTOPUS, OCTOPUS2, OCTOPUS3, OCTOPUS3D, OCTOPUS3D2, OCTOPUS3D3, ASCII_OCTOPUS, MINECRAFT, MINECRAFT2, FRACTAL, ORB.',
    "updatedAt" = NOW()
WHERE "key" = 'DEFAULT_AGENT_AVATAR_VISUAL';
