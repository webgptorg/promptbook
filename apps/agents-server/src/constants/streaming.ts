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
 * Interval (milliseconds) between keep-alive pings emitted while the chat server
 * is still composing the reply.
 *
 * @private internal streaming helper for Promptbook chat connections
 */
export const CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS = 25_000;
