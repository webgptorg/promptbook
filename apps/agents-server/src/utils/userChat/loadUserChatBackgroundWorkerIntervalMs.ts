import { cache } from 'react';
import {
    DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS,
    USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS_METADATA_KEY,
} from '@/src/constants/userChatBackgroundWorker';
import { getMetadataMap } from '@/src/database/getMetadata';

/**
 * Minimum accepted background wake interval in milliseconds.
 *
 * @private internal utility of `userChat`
 */
const MIN_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS = 10_000;

/**
 * Maximum accepted background wake interval in milliseconds.
 *
 * @private internal utility of `userChat`
 */
const MAX_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS = 60 * 60_000;

/**
 * Parses one metadata interval value into a bounded positive integer.
 *
 * @param rawValue - Stored metadata value.
 * @param fallback - Fallback value used when parsing fails.
 * @returns Parsed and clamped interval in milliseconds.
 *
 * @private internal utility of `userChat`
 */
function parseBackgroundWorkerIntervalMs(rawValue: string | null | undefined, fallback: number): number {
    if (typeof rawValue !== 'string') {
        return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return fallback;
    }

    return Math.min(MAX_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS, Math.max(MIN_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS, parsedValue));
}

/**
 * Request-scoped cached loader for the background wake interval metadata.
 *
 * @returns Configured interval in milliseconds.
 *
 * @private internal utility of `userChat`
 */
const loadUserChatBackgroundWorkerIntervalMsCached = cache(async (): Promise<number> => {
    const metadata = await getMetadataMap([USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS_METADATA_KEY]);

    return parseBackgroundWorkerIntervalMs(
        metadata[USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS_METADATA_KEY],
        DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS,
    );
});

/**
 * Loads the background wake interval for durable queued chat jobs.
 *
 * @returns Interval in milliseconds used by cron-triggered durable job wake-ups.
 *
 * @private internal utility of `userChat`
 */
export async function loadUserChatBackgroundWorkerIntervalMs(): Promise<number> {
    try {
        return await loadUserChatBackgroundWorkerIntervalMsCached();
    } catch (error) {
        console.warn('[user-chat-job] failed_to_load_background_interval_metadata', {
            error,
        });
        return DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS;
    }
}
