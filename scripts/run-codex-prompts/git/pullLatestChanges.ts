import { spaceTrim } from 'spacetrim';
import { listGitRemotes, readCurrentBranchName, readOptionalGitConfig, hasUpstreamBranch } from './gitBranchContext';
import { runGitCommand } from './runGitCommand';

/**
 * Branded error used when pulling repository changes fails.
 */
class GitPullFailedError extends Error {
    public readonly name = 'GitPullFailedError';

    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, GitPullFailedError.prototype);
    }
}

/**
 * Pulls the latest repository changes before the next prompt starts.
 */
export async function pullLatestChanges(projectPath = process.cwd()): Promise<void> {

    if (await hasUpstreamBranch(projectPath)) {
        await executeGitPullCommand('git pull --rebase', projectPath);
        return;
    }

    const currentBranch = await readCurrentBranchName(projectPath);
    if (currentBranch === 'HEAD') {
        throw new GitPullFailedError(
            spaceTrim(`
                Failed to pull the latest repository changes because Git is in detached HEAD mode.

                Actionable hint:
                - Check out a branch first, then rerun \`ptbk coder run --auto-pull\`.
            `),
        );
    }

    const remoteName = await resolveDefaultRemoteName(currentBranch, projectPath);
    await executeGitPullCommand(`git pull --rebase "${remoteName}" "${currentBranch}"`, projectPath);
}

/**
 * Resolves which remote should be used when the current branch does not yet track an upstream branch.
 */
async function resolveDefaultRemoteName(currentBranch: string, projectPath: string): Promise<string> {
    const pullDefault = await readOptionalGitConfig('remote.pushDefault', projectPath);
    if (pullDefault) {
        return pullDefault;
    }

    const branchRemote = await readOptionalGitConfig(`branch.${currentBranch}.remote`, projectPath);
    if (branchRemote) {
        return branchRemote;
    }

    const remotes = await listGitRemotes(projectPath);

    if (remotes.includes('origin')) {
        return 'origin';
    }

    if (remotes.length === 1) {
        return remotes[0]!;
    }

    if (remotes.length > 1) {
        throw new GitPullFailedError(
            spaceTrim(`
                Failed to pull the latest repository changes because no default remote is configured.

                Available remotes: ${remotes.join(', ')}

                Actionable hint:
                - Configure \`remote.pushDefault\` or \`branch.${currentBranch}.remote\`, then rerun \`ptbk coder run --auto-pull\`.
            `),
        );
    }

    throw new GitPullFailedError(
        spaceTrim(`
            Failed to pull the latest repository changes because no Git remote is configured.

            Actionable hint:
            - Add a remote (for example \`git remote add origin <repository-url>\`) and rerun \`ptbk coder run --auto-pull\`.
        `),
    );
}

/**
 * Executes one pull command and wraps failures into a detailed branded error.
 */
async function executeGitPullCommand(command: string, projectPath: string): Promise<void> {
    try {
        await runGitCommand({
            command,
            cwd: projectPath,
        });
    } catch (error) {
        throw new GitPullFailedError(buildPullFailureMessage(command, error));
    }
}

/**
 * Builds a failure message that includes actionable hints for common pull problems.
 */
function buildPullFailureMessage(command: string, error: unknown): string {
    const details = stringifyUnknownError(error).trim() || '(No Git output)';
    const hints = buildPullFailureHints(details);
    const hintsMarkdown = hints.map((hint) => `- ${hint}`).join('\n');

    return spaceTrim(
        (block) => `
            Failed to pull the latest repository changes before running the next prompt.

            Command:
            \`${command}\`

            Git output:
            \`\`\`
            ${block(details)}
            \`\`\`

            Actionable hints:
            ${block(hintsMarkdown)}
        `,
    );
}

/**
 * Derives actionable pull hints from Git output text.
 */
function buildPullFailureHints(output: string): string[] {
    const normalizedOutput = output.toLowerCase();
    const hints: string[] = [];

    if (
        hasAnyPattern(normalizedOutput, [
            'authentication failed',
            'permission denied',
            'could not read username',
            'repository not found',
            'access denied',
            '403',
            '401',
            'could not read from remote repository',
            'publickey',
        ])
    ) {
        hints.push(
            'Authentication/authorization failed. Verify Git credentials or SSH key and repository permissions.',
        );
    }

    if (
        hasAnyPattern(normalizedOutput, [
            'could not resolve host',
            'unable to access',
            'connection timed out',
            'failed to connect',
        ])
    ) {
        hints.push('Network or remote host issue. Verify connectivity/VPN and remote URL availability.');
    }

    if (
        hasAnyPattern(normalizedOutput, [
            'conflict',
            'merge conflict',
            'could not apply',
            'rebase in progress',
            'cannot pull with rebase',
        ])
    ) {
        hints.push(
            'Git pull requires manual conflict resolution. Resolve the rebase/merge state, then rerun the coding script.',
        );
    }

    if (hasAnyPattern(normalizedOutput, ['please commit your changes', 'would be overwritten', 'unstaged changes'])) {
        hints.push(
            'Working tree is not clean enough for pull. Commit, stash, or discard local changes before rerunning.',
        );
    }

    if (hints.length === 0) {
        hints.push('Run the same `git pull` command manually to inspect full output and resolve the repository state.');
    }

    return hints;
}

/**
 * Checks whether any search pattern is present in a normalized text.
 */
function hasAnyPattern(normalizedText: string, patterns: ReadonlyArray<string>): boolean {
    return patterns.some((pattern) => normalizedText.includes(pattern));
}

/**
 * Stringifies unknown error values into readable text.
 */
function stringifyUnknownError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return JSON.stringify(error, null, 2);
}
