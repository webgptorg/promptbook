CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_running_leaseExpiresAt_idx"
    ON "prefix_UserChatJob" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING';

CREATE INDEX IF NOT EXISTS "prefix_UserChatJob_queued_queuedAt_uncancelled_idx"
    ON "prefix_UserChatJob" ("queuedAt" ASC, "createdAt" ASC)
    WHERE "status" = 'QUEUED' AND "cancelRequestedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_running_leaseExpiresAt_idx"
    ON "prefix_UserChatTimeout" ("leaseExpiresAt" ASC)
    WHERE "status" = 'RUNNING';

CREATE INDEX IF NOT EXISTS "prefix_UserChatTimeout_queued_dueAt_unpaused_idx"
    ON "prefix_UserChatTimeout" ("dueAt" ASC, "createdAt" ASC)
    WHERE "status" = 'QUEUED' AND "cancelRequestedAt" IS NULL AND "pausedAt" IS NULL;
