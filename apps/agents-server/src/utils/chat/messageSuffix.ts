import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * Delay between emitted chunks when suffix streaming is emulated.
 */
const MESSAGE_SUFFIX_STREAM_DELAY_MS = 100;

/**
 * Number of line breaks required between the main response and the suffix.
 */
const MESSAGE_SUFFIX_MIN_LINE_BREAKS = 2;

/**
 * Resolves normalized MESSAGE SUFFIX content from one agent source.
 */
export function resolveMessageSuffixFromAgentSource(agentSource: string_book): string | null {
    const agentProfile = parseAgentSource(agentSource);
    return normalizeMessageSuffix(agentProfile.meta.messageSuffix);
}

/**
 * Normalizes a raw suffix value to either trimmed text or null.
 */
export function normalizeMessageSuffix(rawMessageSuffix: unknown): string | null {
    if (typeof rawMessageSuffix !== 'string') {
        return null;
    }

    const normalized = rawMessageSuffix.trim();
    return normalized.length > 0 ? normalized : null;
}

/**
 * Creates the exact suffix appendix that should be appended to one assistant message.
 */
export function createMessageSuffixAppendix(content: string, messageSuffix: string | null): string {
    if (!messageSuffix) {
        return '';
    }

    if (content.trim() === '') {
        return messageSuffix;
    }

    return `${buildMessageSuffixSeparator(content)}${messageSuffix}`;
}

/**
 * Appends MESSAGE SUFFIX to one assistant message content.
 */
export function appendMessageSuffix(content: string, messageSuffix: string | null): string {
    return `${content}${createMessageSuffixAppendix(content, messageSuffix)}`;
}

/**
 * Streams the provided appendix in word-like chunks to emulate token streaming.
 *
 * This mirrors the user-visible effect used by `MockedChat`: text appears
 * progressively instead of being appended all at once.
 */
export async function emulateMessageSuffixStreaming(
    suffixAppendix: string,
    onDelta: (delta: string) => void | Promise<void>,
): Promise<void> {
    if (!suffixAppendix) {
        return;
    }

    const deltas = createWordLikeDeltas(suffixAppendix);
    for (let index = 0; index < deltas.length; index++) {
        const delta = deltas[index];
        if (!delta) {
            continue;
        }

        await onDelta(delta);

        if (index < deltas.length - 1) {
            await waitFor(MESSAGE_SUFFIX_STREAM_DELAY_MS);
        }
    }
}

/**
 * Splits text into word-like chunks while preserving whitespace.
 */
function createWordLikeDeltas(content: string): Array<string> {
    return content.match(/\S+\s*|\s+/g) || [];
}

/**
 * Waits for the specified number of milliseconds.
 */
async function waitFor(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Builds newline separator so the suffix is preceded by at least `MESSAGE_SUFFIX_MIN_LINE_BREAKS`.
 *
 * @param content assistant response that may already end with newlines
 * @returns string made of newline characters required to reach the minimum gap
 */
function buildMessageSuffixSeparator(content: string): string {
    const trailingNewlinesMatch = content.match(/\n*$/);
    const trailingNewlines = trailingNewlinesMatch?.[0].length ?? 0;
    const missingNewlines = Math.max(0, MESSAGE_SUFFIX_MIN_LINE_BREAKS - trailingNewlines);
    return '\n'.repeat(missingNewlines);
}
