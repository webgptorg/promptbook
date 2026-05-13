import { spaceTrim } from 'spacetrim';
import type { string_agent_name } from '../../types/string_agent_name';
import { titleToName } from '../../utils/normalization/titleToName';

/**
 * Normalizes agent name from arbitrary string to valid agent name
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/core`
 */
export function normalizeAgentName(rawAgentName: string): string_agent_name {
    return titleToName(spaceTrim(rawAgentName));
}
