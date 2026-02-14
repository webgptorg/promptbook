CREATE TABLE IF NOT EXISTS "prefix_UserChat" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "lastMessageAt" TIMESTAMP WITH TIME ZONE NULL,
    "userId" BIGINT NOT NULL,
    "agentPermanentId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "prefix_UserChat_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "prefix_User"("id")
        ON DELETE CASCADE,
    CONSTRAINT "prefix_UserChat_agentPermanentId_fkey"
        FOREIGN KEY ("agentPermanentId")
        REFERENCES "prefix_Agent"("permanentId")
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "prefix_UserChat_userId_idx" ON "prefix_UserChat" ("userId");
CREATE INDEX IF NOT EXISTS "prefix_UserChat_agentPermanentId_idx" ON "prefix_UserChat" ("agentPermanentId");
CREATE INDEX IF NOT EXISTS "prefix_UserChat_userId_agentPermanentId_lastMessageAt_idx"
    ON "prefix_UserChat" ("userId", "agentPermanentId", "lastMessageAt" DESC, "updatedAt" DESC);

ALTER TABLE "prefix_UserChat" ENABLE ROW LEVEL SECURITY;
