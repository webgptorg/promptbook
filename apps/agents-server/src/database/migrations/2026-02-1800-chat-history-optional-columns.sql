ALTER TABLE "prefix_ChatHistory"
    ADD COLUMN IF NOT EXISTS "source" TEXT;

ALTER TABLE "prefix_ChatHistory"
    ADD COLUMN IF NOT EXISTS "apiKey" TEXT;

ALTER TABLE "prefix_ChatHistory"
    DROP CONSTRAINT IF EXISTS "prefix_ChatHistory_source_check",
    ADD CONSTRAINT "prefix_ChatHistory_source_check"
    CHECK ("source" IS NULL OR "source" IN ('AGENT_PAGE_CHAT', 'OPENAI_API_COMPATIBILITY'));
