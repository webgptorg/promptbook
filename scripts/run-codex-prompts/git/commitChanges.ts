import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { buildAgentGitEnv, buildAgentGitSigningFlag } from './agentGitIdentity';
import { runGitCommand } from './runGitCommand';

/**
 * Commits staged changes with the provided message using the dedicated coding-agent identity when configured,
 * otherwise falls back to the default Git configuration. Remote pushing is opt-in via `options.autoPush`.
 */
export async function commitChanges(message: string, options?: { autoPush?: boolean }): Promise<void> {
    const projectPath = process.cwd();
    const commitMessagePath = join(projectPath, '.tmp', 'codex-prompts', `COMMIT_MESSAGE_${Date.now()}.txt`);
    await mkdir(dirname(commitMessagePath), { recursive: true });
    await writeFile(commitMessagePath, message, 'utf-8');

    try {
        const agentEnv = buildAgentGitEnv();
        const signingFlag = buildAgentGitSigningFlag();
        await runGitCommand({
            command: 'git add .',
            cwd: projectPath,
            env: agentEnv,
        });

        await runGitCommand({
            command: buildGitCommitCommand(commitMessagePath, signingFlag),
            cwd: projectPath,
            env: agentEnv,
        });

        if (options?.autoPush) {
            await pushCommittedChanges(projectPath, agentEnv);
        }
    } finally {
        await unlink(commitMessagePath).catch(() => undefined);
    }
}

/**
 * Branded error used when pushing committed changes fails.
 */
class GitPushFailedError extends Error {
    public readonly name = 'GitPushFailedError';

    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, GitPushFailedError.prototype);
    }
}

/**
 * Pushes the current branch after a successful commit.
 *
 * Behavior:
 * - Uses `git push` when upstream exists.
 * - Uses `git push --set-upstream` on first push when upstream is missing.
 * - Skips pushing when upstream exists and there is nothing to push.
 */
async function pushCommittedChanges(projectPath: string, agentEnv?: Record<string, string>): Promise<void> {
    if (await hasUpstreamBranch(projectPath, agentEnv)) {
        const commitsAhead = await countCommitsAheadOfUpstream(projectPath, agentEnv);
        if (commitsAhead === 0) {
            return;
        }

        await executeGitPushCommand('git push', projectPath, agentEnv);
        return;
    }

    const currentBranch = await readCurrentBranchName(projectPath, agentEnv);
    if (currentBranch === 'HEAD') {
        throw new GitPushFailedError(
            spaceTrim(`
                Failed to push coding-agent commit because Git is in detached HEAD mode.

                Actionable hint:
                - Check out a branch first, then rerun the coding script.
            `),
        );
    }

    const remoteName = await resolveDefaultRemoteName(currentBranch, projectPath, agentEnv);
    await executeGitPushCommand(`git push --set-upstream "${remoteName}" "${currentBranch}"`, projectPath, agentEnv);
}

/**
 * Checks whether the current branch has an upstream reference.
 */
async function hasUpstreamBranch(projectPath: string, agentEnv?: Record<string, string>): Promise<boolean> {
    try {
        await $execCommand({
            command: 'git rev-parse --abbrev-ref --symbolic-full-name @{upstream}',
            cwd: projectPath,
            env: agentEnv,
            isVerbose: false,
        });

        return true;
    } catch {
        return false;
    }
}

/**
 * Counts commits present on local `HEAD` but not on the upstream branch.
 */
async function countCommitsAheadOfUpstream(projectPath: string, agentEnv?: Record<string, string>): Promise<number> {
    const output = await $execCommand({
        command: 'git rev-list --count @{upstream}..HEAD',
        cwd: projectPath,
        env: agentEnv,
        isVerbose: false,
    });
    const parsed = Number.parseInt(output.trim(), 10);

    if (Number.isNaN(parsed)) {
        return 1;
    }

    return parsed;
}

/**
 * Reads the current local branch name.
 */
async function readCurrentBranchName(projectPath: string, agentEnv?: Record<string, string>): Promise<string> {
    const branch = await $execCommand({
        command: 'git rev-parse --abbrev-ref HEAD',
        cwd: projectPath,
        env: agentEnv,
        isVerbose: false,
    });

    return branch.trim();
}

/**
 * Resolves which remote should be used when setting upstream on first push.
 */
async function resolveDefaultRemoteName(
    currentBranch: string,
    projectPath: string,
    agentEnv?: Record<string, string>,
): Promise<string> {
    const pushDefault = await readOptionalGitConfig('remote.pushDefault', projectPath, agentEnv);
    if (pushDefault) {
        return pushDefault;
    }

    const branchRemote = await readOptionalGitConfig(`branch.${currentBranch}.remote`, projectPath, agentEnv);
    if (branchRemote) {
        return branchRemote;
    }

    const remoteOutput = await $execCommand({
        command: 'git remote',
        cwd: projectPath,
        env: agentEnv,
        isVerbose: false,
    });
    const remotes = remoteOutput
        .split('\n')
        .map((remote: string) => remote.trim())
        .filter(Boolean);

    if (remotes.includes('origin')) {
        return 'origin';
    }

    if (remotes.length === 1) {
        return remotes[0]!;
    }

    if (remotes.length > 1) {
        throw new GitPushFailedError(
            spaceTrim(`
                Failed to push coding-agent commit because no default remote is configured.

                Available remotes: ${remotes.join(', ')}

                Actionable hint:
                - Configure \`remote.pushDefault\` or \`branch.${currentBranch}.remote\`, then rerun the coding script.
            `),
        );
    }

    throw new GitPushFailedError(
        spaceTrim(`
            Failed to push coding-agent commit because no Git remote is configured.

            Actionable hint:
            - Add a remote (for example \`git remote add origin <repository-url>\`) and rerun the coding script.
        `),
    );
}

/**
 * Reads optional git config value; returns undefined when the key is missing.
 */
async function readOptionalGitConfig(
    name: string,
    projectPath: string,
    agentEnv?: Record<string, string>,
): Promise<string | undefined> {
    try {
        const value = await $execCommand({
            command: `git config --get "${name}"`,
            cwd: projectPath,
            env: agentEnv,
            isVerbose: false,
        });

        const trimmed = value.trim();
        return trimmed || undefined;
    } catch {
        return undefined;
    }
}

/**
 * Executes one push command and wraps failures into a detailed branded error.
 */
async function executeGitPushCommand(
    command: string,
    projectPath: string,
    agentEnv?: Record<string, string>,
): Promise<void> {
    try {
        await $execCommand({
            command,
            cwd: projectPath,
            env: agentEnv,
        });
    } catch (error) {
        throw new GitPushFailedError(buildPushFailureMessage(command, error));
    }
}

/**
 * Builds the `git commit` command with an optional signing flag.
 */
function buildGitCommitCommand(commitMessagePath: string, signingFlag?: string): string {
    const commandParts = ['git commit'];

    if (signingFlag) {
        commandParts.push(signingFlag);
    }

    commandParts.push(`--file "${commitMessagePath}"`);
    return commandParts.join(' ');
}

/**
 * Builds a failure message that includes actionable hints for common push problems.
 */
function buildPushFailureMessage(command: string, error: unknown): string {
    const details = stringifyUnknownError(error).trim() || '(No Git output)';
    const hints = buildPushFailureHints(details);
    const hintsMarkdown = hints.map((hint) => `- ${hint}`).join('\n');

    return spaceTrim(`
        Failed to push coding-agent commit to the remote repository.

        Command:
        \`${command}\`

        Git output:
        \`\`\`
        ${details}
        \`\`\`

        Actionable hints:
        ${hintsMarkdown}
    `);
}

/**
 * Derives actionable push hints from Git output text.
 */
function buildPushFailureHints(output: string): string[] {
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
            'remote rejected',
            'protected branch',
            'protected branch hook declined',
            'pre-receive hook declined',
            'gh006',
        ])
    ) {
        hints.push('Remote rejected the push. Check branch protection rules or push to an allowed feature branch.');
    }

    if (
        hasAnyPattern(normalizedOutput, [
            'non-fast-forward',
            'fetch first',
            'failed to push some refs',
            'tip of your current branch is behind',
        ])
    ) {
        hints.push('Local branch is behind remote history. Pull/rebase the branch, then rerun the coding script.');
    }

    if (hasAnyPattern(normalizedOutput, ['no upstream branch', 'has no upstream branch'])) {
        hints.push('Upstream branch is missing. Set it with `git push --set-upstream <remote> <branch>`.');
    }

    if (hasAnyPattern(normalizedOutput, ['unable to access', 'could not resolve host', 'connection timed out'])) {
        hints.push('Network or remote host issue. Verify connectivity/VPN and remote URL availability.');
    }

    if (hints.length === 0) {
        hints.push('Run the same `git push` command manually to inspect full output and resolve the repository state.');
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
