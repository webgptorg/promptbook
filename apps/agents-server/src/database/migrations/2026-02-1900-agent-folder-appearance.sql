ALTER TABLE "prefix_AgentFolder"
    ADD COLUMN IF NOT EXISTS "icon" TEXT NULL;

ALTER TABLE "prefix_AgentFolder"
    ADD COLUMN IF NOT EXISTS "color" TEXT NULL;

COMMENT ON COLUMN "prefix_AgentFolder"."icon" IS 'Optional icon identifier rendered for this folder in Agents Server navigation and cards.';
COMMENT ON COLUMN "prefix_AgentFolder"."color" IS 'Optional HEX color rendered for this folder in Agents Server navigation and cards.';
