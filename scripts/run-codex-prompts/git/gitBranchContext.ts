import { $execCommand } from '../../../src/utils/execCommand/$execCommand';

/**
 * Checks whether the current branch has an upstream reference.
 */
export async function hasUpstreamBranch(
    projectPath: string,
    env?: Record<string, string>,
): Promise<boolean> {
    try {
        await $execCommand({
            command: 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}',
            cwd: projectPath,
            env,
            isVerbose: false,
        });

        return true;
    } catch {
        return false;
    }
}

/**
 * Reads the current local branch name.
 */
export async function readCurrentBranchName(
    projectPath: string,
    env?: Record<string, string>,
): Promise<string> {
    const branch = await $execCommand({
        command: 'git rev-parse --abbrev-ref HEAD',
        cwd: projectPath,
        env,
        isVerbose: false,
    });

    return branch.trim();
}

/**
 * Reads optional git config value; returns undefined when the key is missing.
 */
export async function readOptionalGitConfig(
    name: string,
    projectPath: string,
    env?: Record<string, string>,
): Promise<string | undefined> {
    try {
        const value = await $execCommand({
            command: `git config --get "${name}"`,
            cwd: projectPath,
            env,
            isVerbose: false,
        });

        const trimmed = value.trim();
        return trimmed || undefined;
    } catch {
        return undefined;
    }
}

/**
 * Lists configured Git remotes for the current repository.
 */
export async function listGitRemotes(
    projectPath: string,
    env?: Record<string, string>,
): Promise<ReadonlyArray<string>> {
    const remoteOutput = await $execCommand({
        command: 'git remote',
        cwd: projectPath,
        env,
        isVerbose: false,
    });

    return remoteOutput
        .split('\n')
        .map((remote: string) => remote.trim())
        .filter(Boolean);
}
