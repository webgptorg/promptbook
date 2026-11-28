ALTER TABLE "prefix_AgentExternals" ADD COLUMN "vendor" TEXT NOT NULL DEFAULT 'OPENAI';
ALTER TABLE "prefix_AgentExternals" ALTER COLUMN "vendor" DROP DEFAULT;
