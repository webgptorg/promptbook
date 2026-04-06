import { normalizeTo_snake_case } from '../../utils/normalization/normalizeTo_snake_case';

/**
 * Prefix used for TEAM tool names.
 */
const TEAM_TOOL_PREFIX = 'team_chat_';

/**
 * Fallback normalized name when teammate label is empty.
 */
const TEAM_TOOL_FALLBACK_NAME = 'teammate';

/**
 * Normalizes a teammate label into a tool-name-safe snake_case identifier.
 *
 * @param teammateLabel - Human-readable teammate label.
 * @returns Normalized teammate identifier for TEAM tool names.
 * @private internal helper of TEAM tool-name generation
 */
function normalizeTeammateToolNamePart(teammateLabel?: string): string {
    const normalized = normalizeTo_snake_case(teammateLabel || '');
    return normalized || TEAM_TOOL_FALLBACK_NAME;
}

/**
 * Builds a deterministic TEAM tool name from the teammate label.
 *
 * The tool name is derived solely from the human-readable label so that it
 * remains stable and predictable regardless of internal technical identifiers.
 *
 * @param _teammateUrl - Canonical teammate URL (kept for API compatibility, not used).
 * @param teammateLabel - Human-readable teammate label used as the basis for the name.
 * @returns TEAM tool name derived from the label.
 * @private internal utility of TEAM commitments and chat UI mapping
 */
export function createTeamToolName(_teammateUrl: string, teammateLabel?: string): string {
    const normalizedLabel = normalizeTeammateToolNamePart(teammateLabel);
    return `${TEAM_TOOL_PREFIX}${normalizedLabel}`;
}
