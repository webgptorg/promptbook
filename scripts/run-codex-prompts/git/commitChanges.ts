// cspell:ignore pathspec pathspecs NOGLOB ICASE unstaging unstages
import { mkdir, realpath, unlink, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';
import { $runWorkspaceGit } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { spaceTrim } from 'spacetrim';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { resolvePromptbookTemporaryPath } from '../../../src/utils/filesystem/promptbookTemporaryPath';
import { buildAgentGitEnv, buildAgentGitSigningFlag } from './agentGitIdentity';
import { hasUpstreamBranch, listGitRemotes, readCurrentBranchName, readOptionalGitConfig } from './gitBranchContext';
import { runGitCommand } from './runGitCommand';
import { CoderGitOperationError } from './CoderGitOperationError';
import { quoteGitArgument } from './quoteGitArgument';
import { withCoderIndexLease } from './coderIndexLease';
import {
    areCoderFileHashesEqual,
    assertCoderDeltaIsOwned,
    captureCoderRepositorySnapshot,
    listCoderTreeDelta,
    readCoderHead,
    readCoderTree,
    updateCoderIndex,
    withCoderSnapshotIndex,
    type CoderRepositorySnapshot,
    type CoderTreeEntry,
} from './coderRepositorySnapshot';

/** Captured content to commit without checking out an earlier version or disturbing the user's index. */
export type CoderSnapshotCommit = {
    readonly operation: CoderRepositorySnapshot;
    readonly before: CoderRepositorySnapshot;
    readonly after: CoderRepositorySnapshot;
    /** The retained working tree can already contain the following check's transformation. */
    readonly retained: CoderRepositorySnapshot;
    readonly excludedPaths?: ReadonlyArray<string>;
    /** Expected live Git boundary, refreshed only by this operation's preceding local commit. */
    readonly expectedHead?: string;
    readonly expectedIndex?: ReadonlyMap<string, CoderTreeEntry>;
    readonly expectedIndexFlags?: ReadonlyMap<string, string>;
};

/** Exact local persistence identity; callers never infer a successful commit from an arbitrary later HEAD. */
export type CoderCommitResult = {
    readonly commit: string;
    readonly tree: string;
    readonly paths: ReadonlyArray<string>;
};

/**
 * Commits staged changes with the provided message using the dedicated coding-agent identity when configured,
 * otherwise falls back to the default Git configuration. Remote pushing is opt-in via `options.autoPush`,
 * `options.relevantPaths` restricts both the staging and the commit to the files of the current operation,
 * `options.excludePaths` can keep temporary artifacts out of the created commit and
 * `options.isEmptyCommitAllowed` keeps a round without any file change from failing.
 *
 * Note: The temporary commit message file is written inside the project, so it is always excluded from the commit
 *       itself for projects which do not keep the Promptbook temporary directory out of version control.
 */
export async function commitChanges(
    message: string,
    options?: {
        autoPush?: boolean;

        /**
         * Repository-relative paths which are relevant for the current operation.
         *
         * Only these paths are staged and only they end up in the created commit, so unrelated changes of the
         * project are left in the working tree. Everything is committed when the paths are not provided at all.
         * An empty scope is a no-op; an explicitly allowed empty commit never absorbs the user's index.
         */
        relevantPaths?: ReadonlyArray<string>;
        excludePaths?: ReadonlyArray<string>;
        projectPath?: string;
        isEmptyCommitAllowed?: boolean;
        /** Cancels only this job's Git commands, hooks and remote subprocesses. */
        signal?: AbortSignal;
        /** Phase content, rather than the current working files, is authoritative for this commit. */
        snapshot?: CoderSnapshotCommit;
    },
): Promise<CoderCommitResult | undefined> {
    options?.signal?.throwIfAborted();
    const projectPath = options?.projectPath || process.cwd();
    if (options?.snapshot) {
        try {
            const result = await commitSnapshotChanges(message, projectPath, options.snapshot, options.signal);
            if (options.autoPush) await pushCommittedChanges(projectPath, buildAgentGitEnv(), options.signal);
            return result;
        } catch (error) {
            if (error instanceof CoderGitOperationError) throw error;
            throw new CoderGitOperationError('commit', stringifyUnknownError(error));
        }
    }
    const commitMessagePath = resolvePromptbookTemporaryPath(
        projectPath,
        'ptbk-coder',
        'commit-messages',
        `COMMIT_MESSAGE_${Date.now()}.txt`,
    );
    await mkdir(dirname(commitMessagePath), { recursive: true });
    await writeFile(commitMessagePath, message, 'utf-8');

    try {
        const agentEnv = buildAgentGitEnv();
        const signingFlag = buildAgentGitSigningFlag();
        const excludedGitPaths = await normalizeExcludedGitPaths(projectPath, [
            commitMessagePath,
            ...(options?.excludePaths ?? []),
        ]);
        // Note: An excluded path must be dropped from the relevant paths as well, because a commit restricted by
        //       a pathspec commits the working tree content of those paths and would ignore unstaging them
        const relevantPaths = excludeGitPaths(options?.relevantPaths, excludedGitPaths);

        if (relevantPaths?.length === 0 && !options?.isEmptyCommitAllowed) {
            return;
        }

        // A snapshot contains exact filenames, never Git patterns. Bracketed routes or wildcard characters
        // must not expand the operation's scope to unrelated files, even when the caller enabled glob pathspecs.
        const commitEnvironment =
            relevantPaths === undefined
                ? agentEnv
                : {
                      ...agentEnv,
                      GIT_LITERAL_PATHSPECS: '1',
                      GIT_GLOB_PATHSPECS: '0',
                      GIT_NOGLOB_PATHSPECS: '0',
                      GIT_ICASE_PATHSPECS: '0',
                  };
        await stageCommitChanges(projectPath, commitEnvironment, relevantPaths, excludedGitPaths, options?.signal);

        await runGitCommand({
            command: buildGitCommitCommand({
                commitMessagePath,
                signingFlag,
                relevantPaths,
                isEmptyCommitAllowed: options?.isEmptyCommitAllowed,
                isBashShell: process.platform !== 'win32' || Boolean(options?.signal),
            }),
            cwd: projectPath,
            env: commitEnvironment,
            ...(options?.signal ? { signal: options.signal } : {}),
        });

        if (options?.autoPush) {
            await pushCommittedChanges(projectPath, agentEnv, options.signal);
        }
    } catch (error) {
        if (error instanceof CoderGitOperationError) throw error;
        throw new CoderGitOperationError('commit', stringifyUnknownError(error));
    } finally {
        await unlink(commitMessagePath).catch(() => undefined);
    }
    return undefined;
}

/**
 * Commits a phase's exact staged tree. Hooks/signing run normally against a private index; worktree/index drift
 * and hook transformations are terminal persistence errors, never feedback for another model attempt.
 */
async function commitSnapshotChanges(
    message: string,
    repositoryRoot: string,
    snapshot: CoderSnapshotCommit,
    signal?: AbortSignal,
): Promise<CoderCommitResult | undefined> {
    const paths = listCoderTreeDelta(snapshot.before.entries, snapshot.after.entries);
    if (!paths.length) return;
    const operationHeadEntries = snapshot.operation.head
        ? await readCoderTree(repositoryRoot, snapshot.operation.head)
        : new Map();
    assertCoderDeltaIsOwned(snapshot.operation, paths, operationHeadEntries);
    return withCoderIndexLease(repositoryRoot, async (indexLease) => {
        const current = await captureCoderRepositorySnapshot(repositoryRoot, snapshot.excludedPaths);
        if (
            ('expectedHead' in snapshot && current.head !== snapshot.expectedHead) ||
            (snapshot.expectedIndex && listCoderTreeDelta(snapshot.expectedIndex, current.indexEntries).length) ||
            (snapshot.expectedIndexFlags && !areCoderFileHashesEqual(snapshot.expectedIndexFlags, current.indexFlags))
        )
            throw new CoderGitOperationError(
                'record',
                'HEAD or user staging changed between local phase commits. The existing commits and current work were retained; persistence was not repeated.',
            );
        if (!areCoderFileHashesEqual(current.workingFileHashes, snapshot.retained.workingFileHashes)) {
            throw new CoderGitOperationError(
                'record',
                'Unexpected concurrent edits appeared after the phase stopped writing. No phase commit was attempted; all work was retained.',
            );
        }
        const parent = current.head;
        return withCoderSnapshotIndex(repositoryRoot, async (indexPath) => {
            const env = { ...buildAgentGitEnv(), GIT_INDEX_FILE: indexPath };
            await $runWorkspaceGit(repositoryRoot, ['read-tree', parent ?? '--empty'], { env });
            await updateCoderIndex(repositoryRoot, snapshot.after.entries, paths, env);
            const expectedTree = (await $runWorkspaceGit(repositoryRoot, ['write-tree'], { env })).trim();
            // Clean/smudge attributes can give a clean checkout different raw bytes from its stored blob. A check
            // bringing those bytes back to the already committed representation needs no empty Git commit.
            if (
                parent &&
                expectedTree === (await $runWorkspaceGit(repositoryRoot, ['rev-parse', `${parent}^{tree}`])).trim()
            )
                return undefined;
            const commitMessagePath = join(dirname(indexPath), 'message.txt');
            await writeFile(commitMessagePath, message, 'utf-8');
            // Git objects are durable; keep a small recovery record even if commit/signing/push is interrupted.
            const gitDirectory = (await $runWorkspaceGit(repositoryRoot, ['rev-parse', '--absolute-git-dir'])).trim();
            const recoveryPath = join(gitDirectory, 'ptbk-coder', 'pending-persistence.json');
            await writeFile(
                recoveryPath,
                JSON.stringify(
                    {
                        repositoryRoot,
                        parent,
                        expectedTree,
                        beforeTree: snapshot.before.tree,
                        afterTree: snapshot.after.tree,
                        retainedTree: snapshot.retained.tree,
                        paths,
                        message,
                        state: 'pending-commit',
                    },
                    null,
                    2,
                ),
            );
            const immediatelyBeforeCommit = await captureCoderRepositorySnapshot(
                repositoryRoot,
                snapshot.excludedPaths,
            );
            if (
                immediatelyBeforeCommit.head !== parent ||
                immediatelyBeforeCommit.indexFingerprint !== current.indexFingerprint ||
                !areCoderFileHashesEqual(immediatelyBeforeCommit.workingFileHashes, current.workingFileHashes)
            )
                throw new CoderGitOperationError(
                    'record',
                    'Repository/index changed while preparing the phase commit. Inspect pending-persistence.json in the worktree Git directory.',
                );
            signal?.throwIfAborted();
            await runGitCommand({
                command: buildGitCommitCommand({
                    commitMessagePath,
                    signingFlag: buildAgentGitSigningFlag(),
                    isBashShell: process.platform !== 'win32' || Boolean(signal),
                }),
                cwd: repositoryRoot,
                env,
                isIndexLockRetryEnabled: false,
                ...(signal ? { signal } : {}),
            });
            const commit = await readCoderHead(repositoryRoot);
            await writeFile(
                recoveryPath,
                JSON.stringify(
                    {
                        repositoryRoot,
                        parent,
                        commit,
                        expectedTree,
                        paths,
                        message,
                        state: 'committed-awaiting-index',
                    },
                    null,
                    2,
                ),
            );
            const committedTree = (await $runWorkspaceGit(repositoryRoot, ['rev-parse', 'HEAD^{tree}'])).trim();
            const committedParents = (
                await $runWorkspaceGit(repositoryRoot, ['show', '-s', '--format=%P', 'HEAD'])
            ).trim();
            const afterCommit = await captureCoderRepositorySnapshot(repositoryRoot, snapshot.excludedPaths);
            if (
                committedTree !== expectedTree ||
                committedParents !== (parent ?? '') ||
                afterCommit.indexFingerprint !== current.indexFingerprint ||
                !areCoderFileHashesEqual(afterCommit.workingFileHashes, current.workingFileHashes)
            ) {
                throw new CoderGitOperationError(
                    'commit',
                    spaceTrim(`
                Commit \`${commit}\` exists, but a Git hook or concurrent writer changed the captured content/index.
                The resulting tree is **not verified**. Work and the private commit have been retained.
                Inspect \`${recoveryPath}\` before manually recovering; do not rerun the implementation agent.
            `),
                );
            }
            // Replace only operation-owned staging entries. Pre-existing staged/unstaged files stay byte-for-byte intact.
            await indexLease.publish(snapshot.after.entries, paths);
            const expectedIndex = new Map(current.indexEntries);
            const expectedFlags = new Map(current.indexFlags);
            for (const path of paths) {
                const entry = snapshot.after.entries.get(path);
                if (entry) {
                    expectedIndex.set(path, entry);
                    expectedFlags.set(path, 'H');
                } else {
                    expectedIndex.delete(path);
                    expectedFlags.delete(path);
                }
            }
            const afterIndexUpdate = await captureCoderRepositorySnapshot(repositoryRoot, snapshot.excludedPaths);
            if (
                afterIndexUpdate.head !== commit ||
                listCoderTreeDelta(expectedIndex, afterIndexUpdate.indexEntries).length ||
                !areCoderFileHashesEqual(expectedFlags, afterIndexUpdate.indexFlags)
            ) {
                throw new CoderGitOperationError(
                    'record',
                    `The real index/HEAD changed concurrently after commit \`${commit}\`. Its history, index and working files were retained for manual recovery.`,
                );
            }
            await writeFile(
                recoveryPath,
                JSON.stringify(
                    {
                        repositoryRoot,
                        parent,
                        commit,
                        expectedTree,
                        paths,
                        message,
                        state: 'locally-persisted',
                    },
                    null,
                    2,
                ),
            );
            return { commit: commit!, tree: expectedTree, paths };
        });
    });
}

/**
 * Stages the relevant repository changes and unstages temporary files that should not end up inside the commit.
 */
async function stageCommitChanges(
    projectPath: string,
    agentEnv: Record<string, string> | undefined,
    relevantPaths: ReadonlyArray<string> | undefined,
    excludedGitPaths: ReadonlyArray<string>,
    signal?: AbortSignal,
): Promise<void> {
    // Note: An operation which changed nothing relevant has nothing to stage
    if (relevantPaths === undefined || relevantPaths.length > 0) {
        await runGitCommand({
            command: buildGitAddCommand(relevantPaths, process.platform !== 'win32' || Boolean(signal)),
            cwd: projectPath,
            env: agentEnv,
            ...(signal ? { signal } : {}),
        });
    }

    if (excludedGitPaths.length === 0 || relevantPaths !== undefined) {
        // Scoped commits never stage excluded files. Preserve the user's index, including on an unborn branch
        // where resetting a path against HEAD would fail because no first commit exists yet.
        return;
    }

    await runGitCommand({
        command: `git reset --quiet HEAD -- ${excludedGitPaths
            .map((path) => quoteGitArgument(path, process.platform !== 'win32' || Boolean(signal)))
            .join(' ')}`,
        cwd: projectPath,
        env: agentEnv,
        isVerbose: false,
        ...(signal ? { signal } : {}),
    });
}

/**
 * Builds the git add command for either the whole tree or the relevant paths of the current operation.
 */
function buildGitAddCommand(relevantPaths: ReadonlyArray<string> | undefined, isBashShell: boolean): string {
    if (!relevantPaths || relevantPaths.length === 0) {
        return 'git add .';
    }

    return `git add --all -- ${relevantPaths.map((path) => quoteGitArgument(path, isBashShell)).join(' ')}`;
}

/**
 * Removes the excluded repository paths from the relevant paths of the current operation.
 */
function excludeGitPaths(
    relevantPaths: ReadonlyArray<string> | undefined,
    excludedGitPaths: ReadonlyArray<string>,
): ReadonlyArray<string> | undefined {
    if (relevantPaths === undefined || excludedGitPaths.length === 0) {
        return relevantPaths;
    }

    const excludedGitPathSet = new Set(excludedGitPaths);
    return relevantPaths.filter((relevantPath) => !excludedGitPathSet.has(normalizeGitPathSeparators(relevantPath)));
}

/**
 * Normalizes path separators so a relevant path can be matched against a repository-relative Git path.
 */
function normalizeGitPathSeparators(path: string): string {
    return path.replace(/\\/gu, '/');
}

/**
 * Converts excluded filesystem paths into unique repository-relative Git paths.
 */
async function normalizeExcludedGitPaths(
    projectPath: string,
    excludePaths: ReadonlyArray<string> | undefined,
): Promise<ReadonlyArray<string>> {
    if (!excludePaths || excludePaths.length === 0) {
        return [];
    }

    const normalizedExcludedGitPaths = await Promise.all(
        excludePaths.map((excludePath) => normalizeExcludedGitPath(projectPath, excludePath)),
    );

    return [...new Set(normalizedExcludedGitPaths.filter((gitPath): gitPath is string => Boolean(gitPath)))];
}

/**
 * Converts one excluded filesystem path into a Git-friendly repository-relative path.
 */
async function normalizeExcludedGitPath(projectPath: string, excludePath: string): Promise<string | undefined> {
    const absoluteExcludePath = await resolvePathThroughExistingAncestor(resolve(projectPath, excludePath));
    const absoluteProjectPath = await resolvePathThroughExistingAncestor(projectPath);
    const relativeExcludePath = relative(absoluteProjectPath, absoluteExcludePath).replace(/\\/gu, '/');

    if (relativeExcludePath === '' || relativeExcludePath === '.' || relativeExcludePath.startsWith('../')) {
        return undefined;
    }

    return relativeExcludePath;
}

/**
 * Resolves symlinks in the deepest existing ancestor while retaining a potentially missing path suffix.
 *
 * This keeps Git pathspecs relative when macOS presents the same temporary directory through both
 * `/var` and its canonical `/private/var` path.
 */
async function resolvePathThroughExistingAncestor(path: string): Promise<string> {
    const missingPathSegments: string[] = [];
    let existingPath = path;

    for (;;) {
        try {
            return resolve(await realpath(existingPath), ...missingPathSegments);
        } catch {
            const parentPath = dirname(existingPath);

            if (parentPath === existingPath) {
                return path;
            }

            missingPathSegments.unshift(basename(existingPath));
            existingPath = parentPath;
        }
    }
}

/**
 * Branded error used when pushing committed changes fails.
 */
class GitPushFailedError extends CoderGitOperationError {
    public constructor(message: string) {
        super('push', message);
        Object.defineProperty(this, 'name', { value: 'GitPushFailedError' });
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
export async function pushCommittedChanges(
    projectPath: string,
    agentEnv?: Record<string, string>,
    signal?: AbortSignal,
): Promise<void> {
    signal?.throwIfAborted();
    if (await hasUpstreamBranch(projectPath, agentEnv)) {
        const commitsAhead = await countCommitsAheadOfUpstream(projectPath, agentEnv);
        if (commitsAhead === 0) {
            return;
        }

        await executeGitPushCommand('git push', projectPath, agentEnv, signal);
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
    await executeGitPushCommand(
        `git push --set-upstream ${quoteGitArgument(
            remoteName,
            process.platform !== 'win32' || Boolean(signal),
        )} ${quoteGitArgument(currentBranch, process.platform !== 'win32' || Boolean(signal))}`,
        projectPath,
        agentEnv,
        signal,
    );
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

    const remotes = await listGitRemotes(projectPath, agentEnv);

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
 * Executes one push command and wraps failures into a detailed branded error.
 */
async function executeGitPushCommand(
    command: string,
    projectPath: string,
    agentEnv?: Record<string, string>,
    signal?: AbortSignal,
): Promise<void> {
    try {
        await runGitCommand({
            command,
            cwd: projectPath,
            env: agentEnv,
            isIndexLockRetryEnabled: false,
            ...(signal ? { signal } : {}),
        });
    } catch (error) {
        throw new GitPushFailedError(buildPushFailureMessage(command, error));
    }
}

/**
 * Builds the `git commit` command with an optional signing flag.
 */
function buildGitCommitCommand(options: {
    commitMessagePath: string;
    signingFlag?: string;
    relevantPaths?: ReadonlyArray<string>;
    isEmptyCommitAllowed?: boolean;
    isBashShell: boolean;
}): string {
    const commandParts = ['git commit'];

    if (options.signingFlag) {
        commandParts.push(options.signingFlag);
    }

    if (options.isEmptyCommitAllowed) {
        commandParts.push('--allow-empty');
    }

    commandParts.push(`--file ${quoteGitArgument(options.commitMessagePath, options.isBashShell)}`);

    if (options.relevantPaths?.length === 0 && options.isEmptyCommitAllowed) {
        commandParts.push('--only');
    }

    if (options.relevantPaths && options.relevantPaths.length > 0) {
        commandParts.push('--', ...options.relevantPaths.map((path) => quoteGitArgument(path, options.isBashShell)));
    }

    return commandParts.join(' ');
}

/**
 * Builds a failure message that includes actionable hints for common push problems.
 */
function buildPushFailureMessage(command: string, error: unknown): string {
    const details = stringifyUnknownError(error).trim() || '(No Git output)';
    const hints = buildPushFailureHints(details);
    const hintsMarkdown = hints.map((hint) => `- ${hint}`).join('\n');

    return spaceTrim(
        (block) => `
            Failed to push coding-agent commit to the remote repository.

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
