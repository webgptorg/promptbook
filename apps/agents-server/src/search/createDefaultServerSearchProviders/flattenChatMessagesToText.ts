import { normalizeServerSearchText } from '../createServerSearchMatcher';
import { stringifyJsonForSearch } from './stringifyJsonForSearch';

/**
 * Flattens chat message arrays/objects into one plain-text body.
 *
 * @param rawMessages Raw message payload.
 * @returns Normalized searchable conversation text.
 * @private function of createDefaultServerSearchProviders
 */
export function flattenChatMessagesToText(rawMessages: unknown): string {
    const normalizedChunks: string[] = [];

    if (Array.isArray(rawMessages)) {
        for (const message of rawMessages) {
            const text = flattenSingleMessageToText(message);
            if (text) {
                normalizedChunks.push(text);
            }
        }
    } else {
        const text = flattenSingleMessageToText(rawMessages);
        if (text) {
            normalizedChunks.push(text);
        }
    }

    return normalizeServerSearchText(normalizedChunks.join('\n')).slice(0, 2400);
}

/**
 * Flattens one message value into plain text.
 *
 * @param rawMessage One message payload value.
 * @returns Extracted text.
 * @private function of createDefaultServerSearchProviders
 */
function flattenSingleMessageToText(rawMessage: unknown): string {
    if (typeof rawMessage === 'string') {
        return rawMessage;
    }

    if (!rawMessage || typeof rawMessage !== 'object') {
        return '';
    }

    const maybeContent = (rawMessage as { content?: unknown }).content;
    if (typeof maybeContent === 'string') {
        return maybeContent;
    }

    if (Array.isArray(maybeContent)) {
        return maybeContent
            .map((part) => {
                if (typeof part === 'string') {
                    return part;
                }
                if (part && typeof part === 'object') {
                    const maybeText = (part as { text?: unknown }).text;
                    if (typeof maybeText === 'string') {
                        return maybeText;
                    }
                }
                return stringifyJsonForSearch(part);
            })
            .join(' ');
    }

    return stringifyJsonForSearch(rawMessage);
}
