INSERT INTO "prefix_Metadata" ("key", "value", "note", "createdAt", "updatedAt")
SELECT 'SERVER_VISIBILITY',
       'PRIVATE',
       'Global crawling/indexing mode for this server. PRIVATE blocks sitemap and indexing; PUBLIC enables indexing for PUBLIC agents.',
       now(),
       now()
WHERE NOT EXISTS (SELECT 1 FROM "prefix_Metadata" WHERE "key" = 'SERVER_VISIBILITY');

UPDATE "prefix_Metadata"
SET "value" = CASE
                  WHEN UPPER(COALESCE("value", '')) = 'PUBLIC' THEN 'PUBLIC'
                  ELSE 'PRIVATE'
              END,
    "note" = 'Global crawling/indexing mode for this server. PRIVATE blocks sitemap and indexing; PUBLIC enables indexing for PUBLIC agents.',
    "updatedAt" = now()
WHERE "key" = 'SERVER_VISIBILITY';
