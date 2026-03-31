/**
 * Metadata key controlling how long queued chat jobs can wait before background cron wake-ups may start them.
 *
 * @private shared constant for Agents Server durable user-chat workers
 */
export const USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS_METADATA_KEY = 'USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS';

/**
 * Default background wake interval for queued chat jobs (2 minutes).
 *
 * @private shared constant for Agents Server durable user-chat workers
 */
export const DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS = 2 * 60_000;
