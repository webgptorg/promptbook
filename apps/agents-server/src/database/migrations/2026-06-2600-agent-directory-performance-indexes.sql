CREATE INDEX IF NOT EXISTS "prefix_Agent_deletedAt_sortOrder_agentName_idx"
    ON "prefix_Agent" ("deletedAt", "sortOrder", "agentName");

CREATE INDEX IF NOT EXISTS "prefix_Agent_visibility_deletedAt_sortOrder_agentName_idx"
    ON "prefix_Agent" ("visibility", "deletedAt", "sortOrder", "agentName");

CREATE INDEX IF NOT EXISTS "prefix_AgentFolder_deletedAt_parentId_sortOrder_name_idx"
    ON "prefix_AgentFolder" ("deletedAt", "parentId", "sortOrder", "name");

CREATE INDEX IF NOT EXISTS "prefix_UserChat_userId_agentPermanentId_source_createdAt_idx"
    ON "prefix_UserChat" ("userId", "agentPermanentId", "source", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "prefix_UserChat_agentPermanentId_source_userId_createdAt_idx"
    ON "prefix_UserChat" ("agentPermanentId", "source", "userId", "createdAt" DESC);
