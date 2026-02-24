-- Drop the unique constraint on agentName to allow multiple agents with the same name.
-- The unique index was created in 2025-11-0001-initial-schema.sql

DROP INDEX IF EXISTS "prefix_agent_agentname_key";
CREATE INDEX IF NOT EXISTS "prefix_agent_agentname_idx" ON "prefix_Agent" ("agentName");
