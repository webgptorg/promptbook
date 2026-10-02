import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { ConflictError } from '../../../src/errors/ConflictError';
import { buildAgentGitEnv, getAgentGitIdentity } from '../git/agentGitIdentity';
import { pushCommittedChanges } from '../git/commitChanges';
import { hasUpstreamBranch, listGitRemotes } from '../git/gitBranchContext';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { listWorkingTreeChangedFiles } from '../git/workingTreeChanges';
import { executeWorkspaceGit } from '../git/workspaceMutation';
import type { WorkspaceState } from './WorkspaceState';

/**
 * Server synchronization policy around the shared Git services. Safe boundaries are serialized by the caller.
 * Failed pushes retain local completion. Fetch/pull failures pause unsafe integration without stopping the web app.
 */
export class WorkspaceGitSynchronization {
    private nextAttemptAt = 0;
    private failureCount = 0;
    public constructor(
        private readonly workspace: WorkspaceRepositoryContext,
        private readonly state: WorkspaceState,
        private readonly options: {
            readonly autoPull: boolean;
            readonly autoPush: boolean;
            readonly environment?: NodeJS.ProcessEnv;
        },
    ) {}

    /** Reports local-only availability without inventing a remote/upstream. */
    public async initialize(): Promise<void> {
        const root = this.workspace.repositoryRoot!;
        const isRemoteAvailable =
            (await listGitRemotes(root, this.options.environment as Record<string, string>)).length > 0 &&
            (await hasUpstreamBranch(root, this.options.environment as Record<string, string>));
        if (!this.options.autoPull && !this.options.autoPush) {
            this.state.updateControl({
                synchronization: 'local-only',
                reason: 'Automatic pull and push are disabled. Local commits remain available.',
            });
            return;
        }
        this.state.updateControl(
            isRemoteAvailable
                ? this.state.getControl().synchronization === 'blocked'
                    ? {}
                    : {
                          synchronization: 'ready',
                          reason:
                              this.options.autoPull || this.options.autoPush
                                  ? undefined
                                  : 'Automatic pull and push are disabled.',
                      }
                : {
                      synchronization: 'local-only',
                      reason: 'Local commits are available. Pull/push require a configured remote, upstream and credentials.',
                  },
        );
    }

    /** Synchronizes only when safe; bounds automatic retries and keeps failed push distinct from failed implementation. */
    public async synchronize(isForced = false, isCommitBoundary = false): Promise<boolean> {
        const isNewCommit = isCommitBoundary || this.state.getControl().isCommitSynchronizationRequested;
        if (Date.now() < this.nextAttemptAt && !isForced && !(isNewCommit && this.failureCount === 0))
            return this.state.getControl().synchronization !== 'blocked';
        if (this.failureCount >= 3 && !isForced) return this.state.getControl().synchronization !== 'blocked';
        this.state.updateControl({ isCommitSynchronizationRequested: false });
        const root = this.workspace.repositoryRoot!;
        if (
            !(await hasUpstreamBranch(root, this.options.environment as Record<string, string>)) ||
            !(await listGitRemotes(root, this.options.environment as Record<string, string>)).length
        ) {
            await this.initialize();
            return true;
        }
        const isSyncEnabled = this.options.autoPull || this.options.autoPush;
        if (!isSyncEnabled) return true;
        this.nextAttemptAt = Date.now() + 30_000;
        try {
            if (this.options.autoPull)
                await executeWorkspaceGit(
                    root,
                    ['-c', 'rebase.autoStash=false', 'fetch', '--no-tags'],
                    this.options.environment,
                );
            const counts = await executeWorkspaceGit(
                root,
                ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
                this.options.environment,
            );
            const [ahead = 0, behind = 0] = counts.split(/\s/u).map(Number);
            if (behind > 0) {
                if (ahead > 0)
                    throw new ConflictError(
                        'Local and upstream histories diverged. Resolve them manually; the server does not rewrite history.',
                    );
                if ((await listWorkingTreeChangedFiles(root)).length)
                    throw new ConflictError(
                        'Upstream changes are waiting, but the working tree has local changes. Commit or resolve them before synchronization.',
                    );
                if (this.options.autoPull)
                    await pullLatestChanges(root, { isFastForwardOnly: true, environment: this.options.environment });
                else
                    throw new ConflictError(
                        'Upstream changes are waiting and automatic pull is disabled. Synchronize manually.',
                    );
            }
            if (ahead > 0 && this.options.autoPush) {
                try {
                    await pushCommittedChanges(
                        root,
                        {
                            ...this.options.environment,
                            ...buildAgentGitEnv(getAgentGitIdentity(this.options.environment)),
                        } as Record<string, string>,
                        { isNoninteractive: true },
                    );
                } catch (error) {
                    this.failureCount += 1;
                    this.nextAttemptAt = Date.now() + Math.min(300_000, 30_000 * this.failureCount);
                    this.state.updateControl({
                        synchronization: 'push-pending',
                        reason: error instanceof Error ? error.message : String(error),
                    });
                    return true;
                }
            }
            this.failureCount = 0;
            this.state.updateControl({
                synchronization: ahead > 0 && !this.options.autoPush ? 'push-pending' : 'ready',
                reason:
                    ahead > 0 && !this.options.autoPush
                        ? 'Automatic push is disabled. Local commits are pending.'
                        : undefined,
            });
            return true;
        } catch (error) {
            this.failureCount += 1;
            this.state.updateControl({
                synchronization: 'blocked',
                reason: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}

// Note: [🟡] Workspace synchronization is only published in `@promptbook/cli`.
