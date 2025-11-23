import spaceTrim from 'spacetrim';
import { titleToName } from '../../_packages/utils.index';
import { string_agent_name } from '../../types/typeAliases';

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
