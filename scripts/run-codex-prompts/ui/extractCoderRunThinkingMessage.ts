import { normalizeCoderRunConsoleText } from './normalizeCoderRunConsoleText';

/**
 * Maximum length of the currently displayed thinking message.
 */
const MAX_THINKING_MESSAGE_LENGTH = 220;

/**
 * JSON keys that most often contain human-readable streamed agent text.
 */
const PREFERRED_JSON_TEXT_KEYS = [
    'thinking',
    'reasoning',
    'message',
    'content',
    'delta',
    'text',
    'summary',
    'title',
    'error',
] as const;

/**
 * JSON keys that are structural and should not be surfaced as the thinking text.
 */
const IGNORED_JSON_KEYS = new Set([
    'type',
    'role',
    'id',
    'index',
    'usage',
    'timestamp',
    'createdAt',
    'updatedAt',
    'model',
    'provider',
]);

/**
 * Promptbook system lines that should never overwrite the live agent-thinking label.
 */
const IGNORED_THINKING_PREFIXES = [
    'Running prompts with',
    'OpenAI Codex credit spending is disabled.',
    'Following prompts need to be written:',
    'Upcoming tasks',
    'Priority ',
    'No upcoming tasks.',
    'Done:',
    'No prompts ready for agent.',
    'All prompts are done.',
    'Processing ',
    'Next prompt:',
    'Commit message:',
    'Running verification command after attempt #',
    'Verification failed for',
    'Paused',
    'Pausing',
    'Pause cancelled.',
    'Resuming...',
    'Normalized line endings',
    'Tip:',
    'Press Enter to',
] as const;

/**
 * Extracts the latest meaningful agent-thinking text from one raw console message.
 */
export function extractCoderRunThinkingMessage(rawMessage: string): string | undefined {
    const normalizedMessage = normalizeConsoleMessage(rawMessage);
    const lines = normalizedMessage
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (let index = lines.length - 1; index >= 0; index--) {
        const line = lines[index];
        if (!line) {
            continue;
        }

        const extractedCandidate = extractThinkingCandidateFromLine(line);
        if (extractedCandidate) {
            const candidate = finalizeThinkingCandidate(extractedCandidate);
            if (candidate) {
                return candidate;
            }

            continue;
        }

        if (line.startsWith('{') || line.startsWith('[')) {
            continue;
        }

        const candidate = finalizeThinkingCandidate(line);
        if (candidate) {
            return candidate;
        }
    }

    return undefined;
}

/**
 * Normalizes console output before it is parsed for display text.
 */
function normalizeConsoleMessage(rawMessage: string): string {
    return normalizeCoderRunConsoleText(rawMessage);
}

/**
 * Extracts a thinking-text candidate from one console line.
 */
function extractThinkingCandidateFromLine(line: string): string | undefined {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
        return undefined;
    }

    const parsedJsonValue = tryParseJson(trimmedLine);
    if (parsedJsonValue === undefined) {
        return undefined;
    }

    return extractHumanTextFromJsonValue(parsedJsonValue);
}

/**
 * Attempts to parse one console line as JSON.
 */
function tryParseJson(line: string): unknown | undefined {
    if (!line.startsWith('{') && !line.startsWith('[')) {
        return undefined;
    }

    try {
        return JSON.parse(line);
    } catch {
        return undefined;
    }
}

/**
 * Walks one JSON value and returns the most relevant human-readable text field.
 */
function extractHumanTextFromJsonValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index--) {
            const nestedValue = value[index];
            const nestedText = extractHumanTextFromJsonValue(nestedValue);
            if (nestedText) {
                return nestedText;
            }
        }

        return undefined;
    }

    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const record = value as Record<string, unknown>;

    for (const key of PREFERRED_JSON_TEXT_KEYS) {
        const preferredValue = record[key];
        const preferredText = extractHumanTextFromJsonValue(preferredValue);
        if (preferredText) {
            return preferredText;
        }
    }

    for (const [key, nestedValue] of Object.entries(record)) {
        if (IGNORED_JSON_KEYS.has(key)) {
            continue;
        }

        const nestedText = extractHumanTextFromJsonValue(nestedValue);
        if (nestedText) {
            return nestedText;
        }
    }

    return undefined;
}

/**
 * Validates and truncates one thinking-text candidate for compact terminal display.
 */
function finalizeThinkingCandidate(candidate: string): string | undefined {
    const normalizedCandidate = candidate.replace(/\s+/g, ' ').trim();
    if (!normalizedCandidate) {
        return undefined;
    }

    if (IGNORED_THINKING_PREFIXES.some((prefix) => normalizedCandidate.startsWith(prefix))) {
        return undefined;
    }

    if (/^[A-Za-z]:\\.*\bbash(?:\.exe)?\b/i.test(normalizedCandidate)) {
        return undefined;
    }

    if (/^bash\s+"/i.test(normalizedCandidate)) {
        return undefined;
    }

    return truncateForThinkingDisplay(normalizedCandidate);
}

/**
 * Keeps one thinking message compact enough for the terminal UI.
 */
function truncateForThinkingDisplay(value: string): string {
    if (value.length <= MAX_THINKING_MESSAGE_LENGTH) {
        return value;
    }

    return `${value.slice(0, MAX_THINKING_MESSAGE_LENGTH - 3)}...`;
}
