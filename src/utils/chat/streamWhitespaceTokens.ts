const CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE = '[WS:NEWLINE]';
const CHAT_STREAM_WHITESPACE_TOKEN_SPACE = '[WS:SPACE]';
const CHAT_STREAM_WHITESPACE_TOKEN_TAB = '[WS:TAB]';

const CHAT_STREAM_WHITESPACE_ENCODERS: ReadonlyArray<{ pattern: RegExp; token: string }> = [
    { pattern: /\r\n/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\r/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\n/g, token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE },
    { pattern: /\t/g, token: CHAT_STREAM_WHITESPACE_TOKEN_TAB },
    { pattern: /\u00A0/g, token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE },
    { pattern: / /g, token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE },
];

const CHAT_STREAM_WHITESPACE_DECODERS: ReadonlyArray<{ token: string; value: string }> = [
    { token: CHAT_STREAM_WHITESPACE_TOKEN_NEWLINE, value: '\n' },
    { token: CHAT_STREAM_WHITESPACE_TOKEN_TAB, value: '\t' },
    { token: CHAT_STREAM_WHITESPACE_TOKEN_SPACE, value: ' ' },
];

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces whitespace characters inside a streamed chunk with special markers so the transport
 * never emits content that would otherwise be treated as empty.
 *
 * @public exported from `@promptbook/core`
 */
export function encodeChatStreamWhitespaceForTransport(content: string): string {
    if (!content) {
        return content;
    }

    return CHAT_STREAM_WHITESPACE_ENCODERS.reduce((accumulator, encoder) => {
        return accumulator.replace(encoder.pattern, encoder.token);
    }, content);
}

/**
 * Converts encoded whitespace markers back into real whitespace so the UI can render the message
 * exactly as it was generated.
 *
 * @public exported from `@promptbook/core`
 */
export function decodeChatStreamWhitespaceFromTransport(content: string): string {
    if (!content) {
        return content;
    }

    return CHAT_STREAM_WHITESPACE_DECODERS.reduce((accumulator, decoder) => {
        const matcher = new RegExp(escapeRegExp(decoder.token), 'g');
        return accumulator.replace(matcher, decoder.value);
    }, content);
}
