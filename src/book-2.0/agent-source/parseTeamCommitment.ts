import { isValidAgentUrl } from '../../_packages/utils.index';
import type { string_agent_url } from '../../types/typeAliases';
import { normalizeWhitespaces } from '../../utils/normalization/normalizeWhitespaces';

/**
 * Parsed TEAM teammate entry.
 *
 * @private
 */
export type TeamTeammate = {
    url: string_agent_url;
    label: string;
    instructions: string;
};

/**
 * Options for parsing TEAM commitment content.
 *
 * @private
 */
export type ParseTeamCommitmentOptions = {
    strict?: boolean;
};

const urlRegex = /https?:\/\/[^\s]+/gi;
const trailingPunctuationRegex = /[),.;!?]+$/;
const clauseSeparators = ['.', '?', '!', ';', ','];
const conjunctionSeparators = [' and ', ' or '];

/**
 * Parses TEAM commitment content into teammates with instructions.
 *
 * @private
 */
export function parseTeamCommitmentContent(content: string, options: ParseTeamCommitmentOptions = {}): TeamTeammate[] {
    const { strict = false } = options;
    const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const teammates: TeamTeammate[] = [];
    const seenUrls = new Set<string>();

    for (const line of lines) {
        const matches = Array.from(line.matchAll(urlRegex));

        if (matches.length === 0) {
            if (strict) {
                throw new Error(`TEAM commitment expects at least one agent URL, got: "${line}"`);
            }
            continue;
        }

        for (const [matchIndex, match] of matches.entries()) {
            const rawUrl = match[0] || '';
            const cleanedUrl = rawUrl.replace(trailingPunctuationRegex, '');

            if (!isValidAgentUrl(cleanedUrl)) {
                if (strict) {
                    throw new Error(`Invalid agent URL in TEAM commitment: "${cleanedUrl}"`);
                }
                continue;
            }

            if (seenUrls.has(cleanedUrl)) {
                continue;
            }
            seenUrls.add(cleanedUrl);

            const instructionContext = extractInstructionContext(line, matches, matchIndex);
            const instructions = normalizeInstructionText(instructionContext);
            const label = createTeammateLabel(cleanedUrl);

            teammates.push({
                url: cleanedUrl as string_agent_url,
                label,
                instructions,
            });
        }
    }

    return teammates;
}

function extractInstructionContext(line: string, matches: RegExpMatchArray[], matchIndex: number): string {
    const match = matches[matchIndex];
    if (!match || match.index === undefined) {
        return line.trim();
    }

    const rawUrl = match[0] || '';
    const matchStart = match.index;
    const matchEnd = matchStart + rawUrl.length;

    const previousMatch = matches[matchIndex - 1];
    const nextMatch = matches[matchIndex + 1];
    const previousEnd =
        previousMatch && previousMatch.index !== undefined ? previousMatch.index + (previousMatch[0]?.length || 0) : 0;
    const nextStart = nextMatch && nextMatch.index !== undefined ? nextMatch.index : line.length;

    const rawPrefix = line.slice(previousEnd, matchStart);
    const rawSuffix = line.slice(matchEnd, nextStart);

    const prefix = trimAfterLastDelimiter(rawPrefix);
    const suffix = trimBeforeLastDelimiter(rawSuffix);

    if (normalizeInstructionText(suffix)) {
        return suffix;
    }

    if (normalizeInstructionText(prefix)) {
        return prefix;
    }

    return `${prefix} ${suffix}`.trim();
}

function trimAfterLastDelimiter(text: string): string {
    const match = findLastDelimiter(text);
    if (!match) {
        return text;
    }

    return text.slice(match.index + match.length);
}

function trimBeforeLastDelimiter(text: string): string {
    const cleaned = text.replace(/^[,;:]\s*/g, '');
    const match = findLastDelimiter(cleaned);
    if (!match || match.index <= 0) {
        return cleaned;
    }

    return cleaned.slice(0, match.index);
}

function findLastDelimiter(text: string): { index: number; length: number } | null {
    let bestIndex = -1;
    let bestLength = 0;

    for (const separator of clauseSeparators) {
        const index = text.lastIndexOf(separator);
        if (index > bestIndex) {
            bestIndex = index;
            bestLength = separator.length;
        }
    }

    const lowerText = text.toLowerCase();
    for (const separator of conjunctionSeparators) {
        const index = lowerText.lastIndexOf(separator);
        if (index > bestIndex) {
            bestIndex = index;
            bestLength = separator.length;
        }
    }

    if (bestIndex === -1) {
        return null;
    }

    return { index: bestIndex, length: bestLength };
}

function normalizeInstructionText(text: string): string {
    if (!text) {
        return '';
    }

    const withoutUrls = text.replace(urlRegex, '');
    let normalized = normalizeWhitespaces(withoutUrls).trim();

    normalized = normalized.replace(/^[,;:]\s*/g, '');
    normalized = normalized.replace(/^(and|or|the|a|an)\s+/i, '');
    normalized = normalized.replace(/\s*[,;:]\s*$/g, '');
    normalized = normalized.replace(/\s+(and|or)\s*$/i, '');
    normalized = normalizeWhitespaces(normalized).trim();

    return normalized;
}

function createTeammateLabel(url: string): string {
    try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] || parsed.hostname;
        const decoded = decodeURIComponent(lastPart);
        const spaced = decoded.replace(/[-_]+/g, ' ').trim();
        if (!spaced) {
            return parsed.hostname;
        }

        return spaced
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    } catch (error) {
        return url;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
