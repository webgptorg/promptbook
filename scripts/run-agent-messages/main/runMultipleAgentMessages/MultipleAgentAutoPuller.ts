import colors from 'colors';
import type { AgentRunOptions } from '../../AgentRunOptions';
import { pullLatestChangesForAgentQueueIfEnabled } from '../pullLatestChangesForAgentQueueIfEnabled';
import { shouldRunPeriodicTask } from '../shouldRunPeriodicTask';
import { formatProjectPath } from './formatProjectPath';
import type { LocalAgentRunnerProjectSummary } from './LocalAgentRunnerProjectSummary';
import type { MultiAgentAutoPullResult } from './MultiAgentAutoPullResult';
import type { MultipleAgentRunUiPresenter } from './MultipleAgentRunUiPresenter';

/**
 * Delay between idle auto-pull rounds for each watched child repository.
 */
const MULTI_AGENT_IDLE_AUTO_PULL_INTERVAL_MS = 30_000;

/**
 * Owns periodic auto-pull state for watched local repositories.
 *
 * @private class of `runMultipleAgentMessages`
 */
export class MultipleAgentAutoPuller {
    private readonly autoPullTimestampsByProjectPath = new Map<string, number>();

    /**
     * Pulls latest changes for watched child repositories when their idle auto-pull interval elapsed.
     */
    public async pullIfNeeded(options: {
        readonly rootPath: string;
        readonly runOptions: AgentRunOptions;
        readonly uiPresenter: MultipleAgentRunUiPresenter;
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly ignoredAgentCount: number;
    }): Promise<MultiAgentAutoPullResult> {
        const { rootPath, runOptions, uiPresenter, projectSummaries, ignoredAgentCount } = options;
        const pulledProjectPaths = new Set<string>();

        if (!runOptions.autoPull || projectSummaries.length === 0) {
            return { isAnyRepositoryPulled: false, pulledProjectPaths };
        }

        this.pruneTimestampsForCurrentProjects(projectSummaries);

        const projectSummariesToPull = projectSummaries.filter((projectSummary) =>
            shouldRunPeriodicTask({
                lastRunTimestamp: this.autoPullTimestampsByProjectPath.get(projectSummary.project.projectPath),
                intervalMs: MULTI_AGENT_IDLE_AUTO_PULL_INTERVAL_MS,
            }),
        );

        if (projectSummariesToPull.length === 0) {
            return { isAnyRepositoryPulled: false, pulledProjectPaths };
        }

        if (uiPresenter.uiHandle) {
            uiPresenter.updateForAutoPull(projectSummaries, ignoredAgentCount, projectSummariesToPull);
        } else {
            console.info(
                colors.gray(
                    `Pulling latest changes for ${projectSummariesToPull.length} watched agent repositor${
                        projectSummariesToPull.length === 1 ? 'y' : 'ies'
                    }...`,
                ),
            );
        }

        for (const projectSummary of projectSummariesToPull) {
            const projectPath = projectSummary.project.projectPath;
            const autoPullTimestamp = await pullLatestChangesForAgentQueueIfEnabled({
                projectPath,
                runOptions,
                logMessage: uiPresenter.uiHandle
                    ? undefined
                    : `Pulling latest changes in ${formatProjectPath(rootPath, projectPath)}...`,
            });

            if (autoPullTimestamp !== undefined) {
                this.recordAutoPullTimestamp(projectPath, autoPullTimestamp);
                pulledProjectPaths.add(projectPath);
            }
        }

        return {
            isAnyRepositoryPulled: pulledProjectPaths.size > 0,
            pulledProjectPaths,
        };
    }

    /**
     * Records an auto-pull timestamp observed while a child runner processed one message.
     */
    public recordAutoPullTimestamp(projectPath: string, autoPullTimestamp: number): void {
        this.autoPullTimestampsByProjectPath.set(projectPath, autoPullTimestamp);
    }

    private pruneTimestampsForCurrentProjects(projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>): void {
        const currentProjectPaths = new Set(
            projectSummaries.map((projectSummary) => projectSummary.project.projectPath),
        );

        for (const projectPath of this.autoPullTimestampsByProjectPath.keys()) {
            if (!currentProjectPaths.has(projectPath)) {
                this.autoPullTimestampsByProjectPath.delete(projectPath);
            }
        }
    }
}
