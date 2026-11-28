import { humanizeAgentProjectName } from './humanizeAgentProjectName';

/**
 * Maximum count of letters shown in one project initials icon.
 */
const AGENT_PROJECT_INITIALS_MAX_LENGTH = 3;

/**
 * Matches the first letter or digit of one word of a project name.
 */
const PROJECT_NAME_WORD_INITIAL_REGEX = /[\p{L}\p{N}]/u;

/**
 * Initials used for a project whose name has no letters and no digits at all.
 */
const AGENT_PROJECT_FALLBACK_INITIALS = '#';

/**
 * Creates the initials shown for one project which has no favicon.
 *
 * For example `prague-murders-map` becomes `PMM`.
 *
 * @param projectName - Project directory name.
 * @returns Up to three uppercase initials of the project name.
 */
export function createAgentProjectInitials(projectName: string): string {
    const projectInitials = humanizeAgentProjectName(projectName)
        .split(/\s+/u)
        .map((projectNameWord) => PROJECT_NAME_WORD_INITIAL_REGEX.exec(projectNameWord)?.[0] || '')
        .filter((projectNameInitial) => projectNameInitial !== '')
        .slice(0, AGENT_PROJECT_INITIALS_MAX_LENGTH)
        .join('')
        .toUpperCase();

    return projectInitials || AGENT_PROJECT_FALLBACK_INITIALS;
}
