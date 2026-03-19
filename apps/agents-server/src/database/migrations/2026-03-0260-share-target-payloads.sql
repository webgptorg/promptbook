CREATE TABLE IF NOT EXISTS "prefix_ShareTargetPayload" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "agentPermanentId" TEXT NOT NULL,
    "message" TEXT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "consumedAt" TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT "prefix_ShareTargetPayload_agentPermanentId_fkey"
        FOREIGN KEY ("agentPermanentId")
        REFERENCES "prefix_Agent"("permanentId")
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "prefix_ShareTargetPayload_agentPermanentId_createdAt_idx"
    ON "prefix_ShareTargetPayload" ("agentPermanentId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "prefix_ShareTargetPayload_consumedAt_createdAt_idx"
    ON "prefix_ShareTargetPayload" ("consumedAt", "createdAt" DESC);

ALTER TABLE "prefix_ShareTargetPayload" ENABLE ROW LEVEL SECURITY;
