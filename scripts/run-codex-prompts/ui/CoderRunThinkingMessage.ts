import type { CoderRunOutputSource } from './CoderRunSession';

/**
 * ANSI escape sequence matcher used to sanitize terminal output before rendering it in Ink.
 */
const ANSI_ESCAPE_SEQUENCE_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><])/g;

/**
 * Maximum length of one rendered thinking line.
 */
const THINKING_MESSAGE_MAX_LENGTH = 220;

/**
 * Maximum JSON line length worth parsing for structured progress updates.
 */
const JSON_OUTPUT_PARSE_MAX_LENGTH = 20_000;

/**
 * Progress-header lines should never replace the current thinking message.
 */
const CODER_PROGRESS_LINE_PATTERN = /^\d+\/\d+\s+Prompts\s+\(\d+\s+total\)\s+\|/;

/**
 * Output fragments that are important enough to surface in the live event log.
 */
const IMPORTANT_OUTPUT_PATTERNS = [
    /\berror\b/i,
    /\bwarn(?:ing)?\b/i,
    /\bfailed?\b/i,
    /\bretry(?:ing)?\b/i,
    /\bquota\b/i,
    /\brate limit\b/i,
    /\bdenied\b/i,
    /\bexception\b/i,
] as const;

/**
 * JSON keys most likely to contain a short thinking or status message.
 */
const PRIORITY_JSON_MESSAGE_KEYS = [
    'thinking',
    'reasoning',
    'summary',
    'status',
    'message',
    'text',
    'content',
    'delta',
    'description',
    'title',
    'result',
] as const;

/**
 * Removes ANSI escape codes and trims one output line.
 */
export function sanitizeCoderRunOutputLine(line: string): string {
    return line.replace(ANSI_ESCAPE_SEQUENCE_PATTERN, '').replace(/\s+/g, ' ').trim();
}

/**
 * Returns `true` when one output line should also appear in the event log.
 */
export function isImportantCoderRunOutputLine(line: string, source: CoderRunOutputSource): boolean {
    const sanitizedLine = sanitizeCoderRunOutputLine(line);
    if (!sanitizedLine) {
        return false;
    }

    if (source === 'stderr') {
        return true;
    }

    return IMPORTANT_OUTPUT_PATTERNS.some((pattern) => pattern.test(sanitizedLine));
}

/**
 * Extracts one short thinking/status message from a raw runner output line.
 */
export function extractThinkingMessageFromOutputLine(line: string): string | undefined {
    const sanitizedLine = sanitizeCoderRunOutputLine(line);
    if (!sanitizedLine || CODER_PROGRESS_LINE_PATTERN.test(sanitizedLine)) {
        return undefined;
    }

    if (
        (sanitizedLine.startsWith('{') || sanitizedLine.startsWith('[')) &&
        sanitizedLine.length <= JSON_OUTPUT_PARSE_MAX_LENGTH
    ) {
        try {
            const extractedMessage = extractThinkingMessageFromJsonValue(JSON.parse(sanitizedLine));

            if (extractedMessage) {
                return truncateThinkingMessage(extractedMessage);
            }
        } catch {
            if (sanitizedLine.length > THINKING_MESSAGE_MAX_LENGTH) {
                return undefined;
            }
        }
    }

    if (sanitizedLine.length > THINKING_MESSAGE_MAX_LENGTH * 2) {
        return undefined;
    }

    return truncateThinkingMessage(sanitizedLine);
}

/**
 * Recursively searches structured JSON output for a human-readable message.
 */
function extractThinkingMessageFromJsonValue(value: unknown, depth = 0): string | undefined {
    if (depth > 6 || value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === 'string') {
        const sanitizedString = sanitizeCoderRunOutputLine(value);
        return sanitizedString || undefined;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const extractedMessage = extractThinkingMessageFromJsonValue(item, depth + 1);
            if (extractedMessage) {
                return extractedMessage;
            }
        }

        return undefined;
    }

    if (typeof value !== 'object') {
        return undefined;
    }

    const record = value as Record<string, unknown>;

    for (const key of PRIORITY_JSON_MESSAGE_KEYS) {
        if (!(key in record)) {
            continue;
        }

        const extractedMessage = extractThinkingMessageFromJsonValue(record[key], depth + 1);
        if (extractedMessage) {
            return extractedMessage;
        }
    }

    for (const [key, nestedValue] of Object.entries(record)) {
        if ((PRIORITY_JSON_MESSAGE_KEYS as ReadonlyArray<string>).includes(key)) {
            continue;
        }

        if (typeof nestedValue !== 'object' || nestedValue === null) {
            continue;
        }

        const extractedMessage = extractThinkingMessageFromJsonValue(nestedValue, depth + 1);
        if (extractedMessage) {
            return extractedMessage;
        }
    }

    return undefined;
}

/**
 * Trims one thinking message to a compact single-line preview.
 */
function truncateThinkingMessage(message: string): string {
    const sanitizedMessage = sanitizeCoderRunOutputLine(message);
    if (sanitizedMessage.length <= THINKING_MESSAGE_MAX_LENGTH) {
        return sanitizedMessage;
    }

    return `${sanitizedMessage.slice(0, THINKING_MESSAGE_MAX_LENGTH - 3).trimEnd()}...`;
}
