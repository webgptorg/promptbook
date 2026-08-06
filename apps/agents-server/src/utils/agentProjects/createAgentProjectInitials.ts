/**
 * Maximum number of project-name initials displayed in a fallback project icon.
 */
const PROJECT_INITIALS_MAXIMUM_LENGTH = 3;

/**
 * Creates a compact deterministic fallback icon label from a project directory name.
 *
 * @param projectName - Project directory name.
 * @returns One to three uppercase initials, or a question mark for names without letters or numbers.
 */
export function createAgentProjectInitials(projectName: string): string {
    const initials = projectName
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map((word) => Array.from(word)[0]?.toLocaleUpperCase() || '')
        .join('')
        .slice(0, PROJECT_INITIALS_MAXIMUM_LENGTH);

    return initials || '?';
}
