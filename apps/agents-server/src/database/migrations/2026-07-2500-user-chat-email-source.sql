ALTER TABLE "prefix_UserChat"
DROP CONSTRAINT IF EXISTS "prefix_UserChat_source_check";

ALTER TABLE "prefix_UserChat"
ADD CONSTRAINT "prefix_UserChat_source_check"
CHECK ("source" IN ('WEB_UI', 'OPENAI_API', 'TEAM_MEMBER', 'EMAIL'));

ALTER TABLE "prefix_ChatHistory"
DROP CONSTRAINT IF EXISTS "prefix_ChatHistory_source_check";

ALTER TABLE "prefix_ChatHistory"
ADD CONSTRAINT "prefix_ChatHistory_source_check"
CHECK ("source" IN ('AGENT_PAGE_CHAT', 'OPENAI_API_COMPATIBILITY', 'EMAIL'));
