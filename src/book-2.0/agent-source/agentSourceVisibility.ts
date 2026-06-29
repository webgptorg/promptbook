import { ParseError } from '../../errors/ParseError';
import { spaceTrim } from '../../utils/organization/spaceTrim';
import type { string_book } from './string_book';

/**
 * Supported visibility states for persisted agents.
 *
 * @public exported from `@promptbook/core`
 */
export const AGENT_VISIBILITY_VALUES = ['PRIVATE', 'UNLISTED', 'PUBLIC'] as const;

/**
 * Canonical visibility union for agents.
 *
 * @public exported from `@promptbook/core`
 */
export type AgentVisibility = (typeof AGENT_VISIBILITY_VALUES)[number];

/**
 * Fallback visibility used when no valid value is configured.
 *
 * @public exported from `@promptbook/core`
 */
export const DEFAULT_AGENT_VISIBILITY: AgentVisibility = 'UNLISTED';

/**
 * Matches a single-line `META VISIBILITY` commitment in book source.
 */
const META_VISIBILITY_LINE_PATTERN = /^(\s*)META\s+VISIBILITY\b([\s\S]*)$/iu;

/**
 * Returns `true` when the value is one of supported visibility states.
 *
 * @param value - Raw value to validate.
 * @returns Whether the value is a valid `AgentVisibility`.
 *
 * @public exported from `@promptbook/core`
 */
export function isAgentVisibility(value: unknown): value is AgentVisibility {
    return typeof value === 'string' && AGENT_VISIBILITY_VALUES.includes(value as AgentVisibility);
}

/**
 * Normalizes raw visibility text into a supported value.
 *
 * @param value - Raw visibility value.
 * @returns Normalized visibility, or `null` when invalid.
 *
 * @public exported from `@promptbook/core`
 */
export function normalizeAgentVisibility(value: unknown): AgentVisibility | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toUpperCase();
    return isAgentVisibility(normalized) ? normalized : null;
}

/**
 * Parses visibility from an unknown value with a safe fallback.
 *
 * @param value - Raw visibility value.
 * @param fallback - Fallback when the value is invalid.
 * @returns Parsed visibility.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentVisibility(
    value: unknown,
    fallback: AgentVisibility = DEFAULT_AGENT_VISIBILITY,
): AgentVisibility {
    return normalizeAgentVisibility(value) ?? fallback;
}

/**
 * Parses visibility and throws when the value is not supported.
 *
 * @param value - Raw visibility value.
 * @param sourceLabel - Human-readable source used in the error message.
 * @returns Parsed visibility.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentVisibilityStrict(value: unknown, sourceLabel = 'visibility'): AgentVisibility {
    const visibility = normalizeAgentVisibility(value);
    if (visibility) {
        return visibility;
    }

    throw new ParseError(
        spaceTrim(`
            Invalid ${sourceLabel}.

            Value must be one of: ${AGENT_VISIBILITY_VALUES.map((allowedValue) => `\`${allowedValue}\``).join(', ')}.
        `),
    );
}

/**
 * Extracts the last `META VISIBILITY` value from an agent source.
 *
 * @param agentSource - Raw book source.
 * @param options - Strict parsing options.
 * @returns Normalized visibility, or `null` when no commitment is present.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentSourceVisibility(
    agentSource: string_book,
    options: { readonly isStrict?: boolean } = {},
): AgentVisibility | null {
    let visibilityContent: string | null = null;

    for (const line of agentSource.split(/\r?\n/u)) {
        const lineMatch = META_VISIBILITY_LINE_PATTERN.exec(line);
        if (lineMatch) {
            visibilityContent = lineMatch[2]!.trim();
        }
    }

    if (visibilityContent === null) {
        return null;
    }

    const visibility = normalizeAgentVisibility(visibilityContent);
    if (visibility || !options.isStrict) {
        return visibility;
    }

    return parseAgentVisibilityStrict(visibilityContent, '`META VISIBILITY` commitment');
}

/**
 * Returns whether an agent should be listed publicly in anonymous views.
 *
 * @param visibility - Agent visibility to evaluate.
 * @returns `true` for publicly listed agents.
 *
 * @public exported from `@promptbook/core`
 */
export function isPublicAgentVisibility(visibility: AgentVisibility | null | undefined): boolean {
    return visibility === 'PUBLIC';
}

/**
 * Returns the next visibility in UI rotation order.
 *
 * @param visibility - Current visibility.
 * @returns Next visibility value.
 *
 * @public exported from `@promptbook/core`
 */
export function getNextAgentVisibility(visibility: AgentVisibility | null | undefined): AgentVisibility {
    switch (visibility) {
        case 'PRIVATE':
            return 'UNLISTED';
        case 'UNLISTED':
            return 'PUBLIC';
        case 'PUBLIC':
        default:
            return 'PRIVATE';
    }
}

/**
 * Inserts or replaces the `META VISIBILITY` commitment in a book source.
 *
 * @param agentSource - Raw book source.
 * @param visibility - Visibility to persist.
 * @returns Source with exactly one normalized `META VISIBILITY` line.
 *
 * @public exported from `@promptbook/core`
 */
export function setAgentSourceVisibility(agentSource: string_book, visibility: AgentVisibility): string_book {
    const normalizedVisibility = parseAgentVisibilityStrict(visibility, '`META VISIBILITY` commitment');
    const lines = agentSource.split(/\r?\n/u);
    const nextLines: string[] = [];
    let isVisibilityLineWritten = false;

    for (const line of lines) {
        const lineMatch = META_VISIBILITY_LINE_PATTERN.exec(line);
        if (!lineMatch) {
            nextLines.push(line);
            continue;
        }

        if (isVisibilityLineWritten) {
            continue;
        }

        nextLines.push(`${lineMatch[1] ?? ''}META VISIBILITY ${normalizedVisibility}`);
        isVisibilityLineWritten = true;
    }

    if (!isVisibilityLineWritten) {
        nextLines.splice(findMetaVisibilityInsertIndex(nextLines), 0, `META VISIBILITY ${normalizedVisibility}`);
    }

    return nextLines.join('\n') as string_book;
}

/**
 * Finds the position after the first non-empty line, which is the agent title.
 *
 * @param lines - Source lines.
 * @returns Insertion index for profile metadata.
 */
function findMetaVisibilityInsertIndex(lines: ReadonlyArray<string>): number {
    const titleLineIndex = lines.findIndex((line) => line.trim().length > 0);
    return titleLineIndex === -1 ? 0 : titleLineIndex + 1;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
