import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Checks whether one repository-relative path is tracked by Git.
 */
export async function isGitPathTracked(projectPath: string, relativePath: string): Promise<boolean> {
    try {
        await $execCommand({
            command: `git ls-files --error-unmatch -- ${quoteShellPath(relativePath)}`,
            cwd: projectPath,
            isVerbose: false,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Quotes one shell path for safe Git command construction.
 */
function quoteShellPath(path: string): string {
    return JSON.stringify(path);
}
