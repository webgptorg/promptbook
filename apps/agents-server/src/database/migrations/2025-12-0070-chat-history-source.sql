ALTER TABLE "prefix_ChatHistory" ADD COLUMN "source" TEXT CHECK ("source" IN ('AGENT_PAGE_CHAT', 'OPENAI_API_COMPATIBILITY'));
ALTER TABLE "prefix_ChatHistory" ADD COLUMN "apiKey" TEXT;
