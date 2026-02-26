import { createTeamToolName } from '../../../book-2.0/agent-source/createTeamToolName';

/**
 * Prefix shared by all TEAM tool names.
 */
const TEAM_TOOL_PREFIX = 'team_chat_';

/**
 * Builds a TEAM tool name from teammate identity.
 *
 * @private utility of chat components
 */
export function createTeamToolNameFromUrl(url: string, teammateLabel?: string): string {
    return createTeamToolName(url, teammateLabel);
}

/**
 * Checks whether a tool name belongs to a TEAM tool.
 *
 * @private utility of chat components
 */
export function isTeamToolName(name: string): boolean {
    return name.startsWith(TEAM_TOOL_PREFIX);
}
