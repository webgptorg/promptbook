import { isAbsolute, join, relative } from 'path';

/**
 * Rebinds an absolute reference inside a project/repository to its worktree copy. Relative references
 * already resolve against the execution project; explicit references outside that checkout remain explicit.
 */
export function mapProjectReferenceToWorktree(
    reference: string | undefined,
    originalProjectPath: string,
    worktreeProjectPath: string,
): string | undefined {
    if (reference === undefined || !isAbsolute(reference.trim())) return reference;
    const relativePath = relative(originalProjectPath, reference.trim());
    if (isAbsolute(relativePath) || relativePath === '..' || /^\.\.[/\\]/u.test(relativePath)) return reference;
    return join(worktreeProjectPath, relativePath);
}
