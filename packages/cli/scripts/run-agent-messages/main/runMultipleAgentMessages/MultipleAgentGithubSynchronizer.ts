import colors from 'colors';
import type { AgentRunOptions } from '../../AgentRunOptions';
import type { AgentIgnoreMatcher } from '../agentIgnorePatterns';
import { shouldRunPeriodicTask } from '../shouldRunPeriodicTask';
import { synchronizeGithubAgentRunnerRepositories } from '../synchronizeGithubAgentRunnerRepositories';
import type { MultipleAgentRunUiPresenter } from './MultipleAgentRunUiPresenter';

/**
 * Delay between GitHub owner synchronization rounds while the multi-agent runner stays active.
 */
const MULTI_AGENT_GITHUB_SYNC_INTERVAL_MS = 30_000;

/**
 * Delay between GitHub owner synchronization rounds while no local repositories exist yet.
 */
const MULTI_AGENT_EMPTY_DIRECTORY_GITHUB_SYNC_INTERVAL_MS = 2_000;

/**
 * Owns periodic GitHub repository synchronization state for `runMultipleAgentMessages`.
 *
 * @private class of `runMultipleAgentMessages`
 */
export class MultipleAgentGithubSynchronizer {
    private synchronizationTimestamp: number | undefined;
    private ignoredRepositoryCount = 0;

    /**
     * Number of remote repositories ignored during the last synchronization round.
     */
    public get ignoredAgentCount(): number {
        return this.ignoredRepositoryCount;
    }

    /**
     * Synchronizes missing local repositories from GitHub when the owner configuration is available.
     */
    public async synchronizeIfNeeded(options: {
        readonly rootPath: string;
        readonly runOptions: AgentRunOptions;
        readonly ignoreMatcher: AgentIgnoreMatcher;
        readonly uiPresenter: MultipleAgentRunUiPresenter;
        readonly lastObservedProjectCount: number;
    }): Promise<void> {
        const { rootPath, runOptions, ignoreMatcher, uiPresenter, lastObservedProjectCount } = options;

        if (!runOptions.autoClone) {
            this.ignoredRepositoryCount = 0;
            return;
        }

        const synchronizationIntervalMs =
            lastObservedProjectCount === 0
                ? MULTI_AGENT_EMPTY_DIRECTORY_GITHUB_SYNC_INTERVAL_MS
                : MULTI_AGENT_GITHUB_SYNC_INTERVAL_MS;

        if (
            !shouldRunPeriodicTask({
                lastRunTimestamp: this.synchronizationTimestamp,
                intervalMs: synchronizationIntervalMs,
            })
        ) {
            return;
        }

        uiPresenter.updateForGithubSynchronization(lastObservedProjectCount);

        const synchronizationResult = await synchronizeGithubAgentRunnerRepositories(rootPath, { ignoreMatcher });
        this.ignoredRepositoryCount = synchronizationResult.ignoredRepositoryNames?.length || 0;

        if (!uiPresenter.uiHandle && synchronizationResult.clonedRepositoryNames.length > 0) {
            console.info(
                colors.gray(
                    `Cloned ${synchronizationResult.clonedRepositoryNames.length} new agent repositor${
                        synchronizationResult.clonedRepositoryNames.length === 1 ? 'y' : 'ies'
                    }: ${synchronizationResult.clonedRepositoryNames.join(', ')}`,
                ),
            );
        }

        this.synchronizationTimestamp = synchronizationResult.synchronizedAt ?? this.synchronizationTimestamp;
    }
}
