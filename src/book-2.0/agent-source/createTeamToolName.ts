import { computeHash } from '../../utils/misc/computeHash';
import { normalizeTo_snake_case } from '../../utils/normalization/normalizeTo_snake_case';

/**
 * Prefix used for TEAM tool names.
 */
const TEAM_TOOL_PREFIX = 'team_chat_';

/**
 * Length of URL hash suffix appended to TEAM tool names.
 */
const TEAM_TOOL_HASH_LENGTH = 10;

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
 * Builds a deterministic TEAM tool name from teammate identity.
 *
 * The readable part is based on teammate label while the hash suffix
 * keeps uniqueness and stable mapping for the underlying teammate URL.
 *
 * @param teammateUrl - Canonical teammate URL used at runtime.
 * @param teammateLabel - Human-readable teammate label.
 * @returns Deterministic TEAM tool name.
 * @private internal utility of TEAM commitments and chat UI mapping
 */
export function createTeamToolName(teammateUrl: string, teammateLabel?: string): string {
    const normalizedLabel = normalizeTeammateToolNamePart(teammateLabel);
    const hash = computeHash(teammateUrl).substring(0, TEAM_TOOL_HASH_LENGTH);
    return `${TEAM_TOOL_PREFIX}${normalizedLabel}_${hash}`;
}
