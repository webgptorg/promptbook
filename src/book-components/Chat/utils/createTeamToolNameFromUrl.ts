import { computeHash } from '../../../_packages/utils.index';

const TEAM_TOOL_PREFIX = 'team_chat_';

/**
 * Builds a TEAM tool name from a teammate agent URL.
 *
 * @private utility of chat components
 */
export function createTeamToolNameFromUrl(url: string): string {
    const hash = computeHash(url).substring(0, 10);
    return `${TEAM_TOOL_PREFIX}${hash}`;
}

/**
 * Checks whether a tool name belongs to a TEAM tool.
 *
 * @private utility of chat components
 */
export function isTeamToolName(name: string): boolean {
    return name.startsWith(TEAM_TOOL_PREFIX);
}
