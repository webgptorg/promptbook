import { CHAT_STREAM_WHITESPACE_DECODERS } from './constants';
import { escapeRegExp } from './escapeRegExp';

/**
 * Converts encoded whitespace markers back into real whitespace so the UI can render the message
 * exactly as it was generated.
 *
 * @private internal mechanism for chat stream whitespace encoding/decoding
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
