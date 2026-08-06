import { capitalize } from '@promptbook-local/utils';

/**
 * Separators used between the words of one project directory name.
 */
const AGENT_PROJECT_NAME_WORD_SEPARATOR_REGEX = /[-_.\s]+/g;

/**
 * Converts one project directory name into a human-readable project name.
 *
 * For example `prague-murders-map` becomes `Prague Murders Map`.
 *
 * @param projectName - Project directory name.
 * @returns Human-readable project name, or the original name when it cannot be humanized.
 */
export function humanizeAgentProjectName(projectName: string): string {
    const humanizedProjectName = projectName
        .trim()
        .split(AGENT_PROJECT_NAME_WORD_SEPARATOR_REGEX)
        .filter((projectNameWord) => projectNameWord !== '')
        .map((projectNameWord) => capitalize(projectNameWord))
        .join(' ');

    return humanizedProjectName || projectName;
}
