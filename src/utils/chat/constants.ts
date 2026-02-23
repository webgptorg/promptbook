/**
 * @@@
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */
const CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE = '[WS:NEWLINE]';

/**
 * @@@
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */
const CHAT_STREAM_WHITESPACE_TOKEN_SPACE = '[WS:SPACE]';

/**
 * @@@
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */
const CHAT_STREAM_WHITESPACE_TOKEN_TAB = '[WS:TAB]';

/**
 * @@@
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */
export const CHAT_STREAM_WHITESPACE_ENCODERS: ReadonlyArray<{ pattern: RegExp; token: string }> = [
    { pattern: /\r\n/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\r/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\n/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\t/g, token: CHAT_STREAM_WHITESPACE_TOKEN_TAB },
    { pattern: /\u00A0/g, token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE },
    { pattern: / /g, token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE },
];

/**
 * @@@
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */
export const CHAT_STREAM_WHITESPACE_DECODERS: ReadonlyArray<{ token: string; value: string }> = [
    { token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE, value: '\n' },
    { token: CHAT_STREAM_WHITESPACE_TOKEN_TAB, value: '\t' },
    { token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE, value: ' ' },
];

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
