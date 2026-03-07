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
    COALESCE("updatedAt", "createdAt", now()) AS "createdAt",
    "agentName",
    "permanentId",
    "agentHash",
    NULL AS "previousAgentHash",
    "agentSource",
    "promptbookEngineVersion"
FROM "prefix_Agent" AS a
WHERE a."permanentId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "prefix_AgentHistory" AS ah
      WHERE ah."permanentId" = a."permanentId"
  );
