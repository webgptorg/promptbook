INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'IS_EMBEDDING_ALLOWED', 'true', 'Allow serving the iframe-friendly agent route for third-party embeds.', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'IS_EMBEDDING_ALLOWED');

UPDATE "prefix_Metadata"
SET "value" = 'true',
    "note" = 'Allow serving the iframe-friendly agent route for third-party embeds.',
    "updatedAt" = NOW()
WHERE "key" = 'IS_EMBEDDING_ALLOWED';
