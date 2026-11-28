import { CHAT_STREAM_WHITESPACE_ENCODERS } from './constants';

/**
 * Replaces whitespace characters inside a streamed chunk with special markers so the transport
 * never emits content that would otherwise be treated as empty.
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
 */

export function encodeChatStreamWhitespaceForTransport(content: string): string {
    if (!content) {
        return content;
    }

    return CHAT_STREAM_WHITESPACE_ENCODERS.reduce((accumulator, encoder) => {
        return accumulator.replace(encoder.pattern, encoder.token);
    }, content);
}
