/**
 * Keep-alive helpers used for streaming chat responses.
 *
 * These constants coordinate the signal sent by the Agents Server streaming
 * endpoint and the parser in the SDK so we can distinguish between
 * real content and occasional pings.
 *
 * @private internal streaming helper for Promptbook chat connections
 */
export const CHAT_STREAM_KEEP_ALIVE_TOKEN = 'STREAM_KEEP_ALIVE';

/**
 * Prefix used for metadata frames injected into the chat stream.
 *
 * Each metadata line starts with this token so the client can safely decode
 * tool-call updates, keep-alives, or other control information without
 * confusing it with user-facing content.
 *
 * @private internal streaming helper for Promptbook chat connections
 */
export const CHAT_STREAM_METADATA_PREFIX = '[STREAM_METADATA]';

/**
 * Interval (milliseconds) between keep-alive pings emitted while the chat server
 * is still composing the reply.
 *
 * @private internal streaming helper for Promptbook chat connections
 */
export const CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS = 25_000;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
