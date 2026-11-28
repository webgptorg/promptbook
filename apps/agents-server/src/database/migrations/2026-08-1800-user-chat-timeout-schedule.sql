-- Planned messages can repeat on a cron, for a bounded number of runs, and inside a date window.
-- Existing rows keep their `recurrenceIntervalMs` behaviour, because every added column is optional.
ALTER TABLE "prefix_UserChatTimeout"
    ADD COLUMN IF NOT EXISTS "cronExpression" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS "maxRunCount" INTEGER NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_endsAt_idx"
    ON "prefix_UserChatTimeout" ("endsAt")
    WHERE "endsAt" IS NOT NULL;
