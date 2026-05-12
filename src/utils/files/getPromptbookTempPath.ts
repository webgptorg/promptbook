import { join, posix } from 'path';

/**
 * Relative directory name without the `./` prefix for Git ignore rules and glob patterns.
 *
 * @private internal utility for Promptbook-owned temp files
 */
const PROMPTBOOK_TEMP_DIRECTORY_NAME = '.promptbook';

/**
 * Builds one project-relative path inside the shared Promptbook working directory.
 *
 * @private internal utility for Promptbook-owned temp files
 */
export function getPromptbookTempPath(...pathSegments: ReadonlyArray<string>): string {
    return `./${getPromptbookTempPosixPath(...pathSegments)}`;
}

/**
 * Builds one absolute filesystem path inside the shared Promptbook working directory for a project root.
 *
 * @private internal utility for Promptbook-owned temp files
 */
export function resolvePromptbookTempPath(projectPath: string, ...pathSegments: ReadonlyArray<string>): string {
    return join(projectPath, PROMPTBOOK_TEMP_DIRECTORY_NAME, ...pathSegments);
}

/**
 * Builds one POSIX path fragment inside the shared Promptbook working directory for globs and generated text files.
 *
 * @private internal utility for Promptbook-owned temp files
 */
export function getPromptbookTempPosixPath(...pathSegments: ReadonlyArray<string>): string {
    return posix.join(PROMPTBOOK_TEMP_DIRECTORY_NAME, ...pathSegments);
}

/**
 * Builds one rooted `.gitignore` rule targeting a path inside the shared Promptbook working directory.
 *
 * @private internal utility for Promptbook-owned temp files
 */
export function getPromptbookTempGitignoreRule(...pathSegments: ReadonlyArray<string>): string {
    return `/${getPromptbookTempPosixPath(...pathSegments)}`;
}

