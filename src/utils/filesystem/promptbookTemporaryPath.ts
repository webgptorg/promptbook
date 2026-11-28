/**
 * Stable root directory used for Promptbook-owned temporary files and caches.
 *
 * @private internal utility for Promptbook temporary folders
 */
export const PROMPTBOOK_TEMPORARY_DIRECTORY = '.promptbook';

/**
 * Builds one normalized project-relative path inside Promptbook's dedicated temporary root.
 *
 * The returned path intentionally uses `/` separators so the same helper can be reused from
 * Node.js and edge-safe code without depending on the Node `path` module.
 *
 * @private internal utility for Promptbook temporary folders
 */
export function getPromptbookTemporaryPath(...pathSegments: ReadonlyArray<string>): string {
    const normalizedPathSegments = pathSegments.flatMap(splitPathSegments).filter(Boolean);
    return [PROMPTBOOK_TEMPORARY_DIRECTORY, ...normalizedPathSegments].join('/');
}

/**
 * Builds one repository-root `.gitignore` rule for a Promptbook temporary path.
 *
 * @private internal utility for Promptbook temporary folders
 */
export function getPromptbookTemporaryGitignoreRule(...pathSegments: ReadonlyArray<string>): string {
    return `/${getPromptbookTemporaryPath(...pathSegments)}`;
}

/**
 * Resolves one absolute or base-relative path inside Promptbook's dedicated temporary root.
 *
 * @private internal utility for Promptbook temporary folders
 */
export function resolvePromptbookTemporaryPath(projectPath: string, ...pathSegments: ReadonlyArray<string>): string {
    const normalizedProjectPath = projectPath.replace(/[\\/]+$/u, '');
    return `${normalizedProjectPath}/${getPromptbookTemporaryPath(...pathSegments)}`;
}

/**
 * Normalizes one raw path segment into slash-delimited pieces without empty items.
 */
function splitPathSegments(pathSegment: string): Array<string> {
    return pathSegment
        .split(/[\\/]+/u)
        .map((segment) => segment.trim())
        .filter(Boolean);
}

// Note: [💞] Ignore a discrepancy between file name and entity name
