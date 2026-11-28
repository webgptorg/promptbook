/**
 * Maximum runtime allowed for one durable user-chat worker route invocation.
 *
 * Kept in sync with the internal worker route export so diagnostics can report the exact limit.
 */
export const USER_CHAT_JOB_WORKER_ROUTE_MAX_DURATION_SECONDS = 300;

/**
 * Maximum runtime allowed for one durable user-chat worker route invocation in milliseconds.
 */
export const USER_CHAT_JOB_WORKER_ROUTE_MAX_DURATION_MS =
    USER_CHAT_JOB_WORKER_ROUTE_MAX_DURATION_SECONDS * 1_000;

/**
 * Maximum time allowed for one heartbeat lease-renewal query before it is aborted.
 *
 * A bounded timeout prevents one stuck Supabase call from wedging the entire serialized
 * heartbeat loop until the lease eventually expires.
 */
export const USER_CHAT_JOB_HEARTBEAT_TIMEOUT_MS = 10_000;

/**
 * Minimum interval between persisted assistant-message snapshots while streaming.
 *
 * Throttling this write path avoids overwhelming Supabase with token-level updates.
 */
export const USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS = 5_000;
