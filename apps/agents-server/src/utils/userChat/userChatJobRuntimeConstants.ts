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
 * Minimum interval between persisted assistant-message snapshots while streaming.
 *
 * Throttling this write path avoids overwhelming Supabase with token-level updates.
 */
export const USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS = 5_000;
