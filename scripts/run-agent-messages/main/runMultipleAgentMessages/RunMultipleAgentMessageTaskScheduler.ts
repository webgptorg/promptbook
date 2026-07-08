import type { AgentRunOptions } from '../../AgentRunOptions';
import type { AgentMessageFile } from '../../messages/AgentMessageFile';
import type { AgentMessageFailureTracker } from '../AgentMessageFailureTracker';
import { handleAgentWatchError } from '../handleAgentWatchError';
import { tickAgentMessages } from '../tickAgentMessages';
import type { ActiveAgentMessageTask } from './ActiveAgentMessageTask';
import type { LocalAgentRunnerProjectSummary } from './LocalAgentRunnerProjectSummary';
import type { LocalAgentRunnerWorkItem } from './LocalAgentRunnerWorkItem';
import type { MultiAgentAutoPullResult } from './MultiAgentAutoPullResult';
import type { MultipleAgentAutoPuller } from './MultipleAgentAutoPuller';
import type { MultipleAgentRunUiPresenter } from './MultipleAgentRunUiPresenter';
import { wait } from './wait';

/**
 * Task scheduler dependencies that are stable for one multi-agent watch session.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type RunMultipleAgentMessageTaskSchedulerOptions = {
    readonly runOptions: AgentRunOptions;
    readonly messageFailureTracker: AgentMessageFailureTracker;
    readonly autoPuller: MultipleAgentAutoPuller;
    readonly uiPresenter: MultipleAgentRunUiPresenter;
    readonly watchErrorLogDirectoryPath: string;
};

/**
 * Owns active queued-message task selection, execution, and settling for `runMultipleAgentMessages`.
 *
 * @private class of `runMultipleAgentMessages`
 */
export class RunMultipleAgentMessageTaskScheduler {
    private readonly activeMessageTasksByKey = new Map<string, ActiveAgentMessageTask>();
    private readonly isParallelMessageLimitConfigured: boolean;
    private readonly maxParallelMessageCount: number;

    public constructor(private readonly options: RunMultipleAgentMessageTaskSchedulerOptions) {
        this.isParallelMessageLimitConfigured = options.runOptions.maxParallelMessages !== undefined;
        this.maxParallelMessageCount = this.normalizeMaxParallelMessageCount(options.runOptions.maxParallelMessages);
    }

    /**
     * Number of currently running harness tasks.
     */
    public get activeMessageCount(): number {
        return this.activeMessageTasksByKey.size;
    }

    /**
     * Selects the next queued messages that can be started without exceeding active harness capacity.
     */
    public selectQueuedWorkItems(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    ): Array<LocalAgentRunnerWorkItem> {
        const availableParallelMessageSlots = Math.max(
            0,
            this.maxParallelMessageCount - this.activeMessageTasksByKey.size,
        );

        if (availableParallelMessageSlots <= 0) {
            return [];
        }

        const activeProjectPaths = new Set(
            Array.from(this.activeMessageTasksByKey.values()).map((activeMessageTask) => activeMessageTask.projectPath),
        );
        const queuedProjectSummaries = projectSummaries.filter((projectSummary) => {
            if (projectSummary.queuedMessageCount === 0) {
                return false;
            }

            return this.isParallelMessageLimitConfigured || !activeProjectPaths.has(projectSummary.project.projectPath);
        });

        if (!this.isParallelMessageLimitConfigured) {
            return queuedProjectSummaries
                .map((projectSummary) => this.selectFirstInactiveQueuedWorkItem(projectSummary))
                .filter((workItem): workItem is LocalAgentRunnerWorkItem => workItem !== null);
        }

        const workItems: Array<LocalAgentRunnerWorkItem> = [];
        for (let messageIndex = 0; workItems.length < availableParallelMessageSlots; messageIndex++) {
            let isAnyMessageAtIndex = false;

            for (const projectSummary of queuedProjectSummaries) {
                const queuedMessage = projectSummary.queuedMessages[messageIndex];
                if (!queuedMessage) {
                    continue;
                }

                isAnyMessageAtIndex = true;
                if (
                    this.activeMessageTasksByKey.has(
                        this.createTaskKey(projectSummary.project.projectPath, queuedMessage),
                    )
                ) {
                    continue;
                }

                workItems.push({ projectSummary, queuedMessage });
                if (workItems.length >= availableParallelMessageSlots) {
                    return workItems;
                }
            }

            if (!isAnyMessageAtIndex) {
                return workItems;
            }
        }

        return workItems;
    }

    /**
     * Builds the set of project paths currently represented by active or newly scheduled harness tasks.
     */
    public createAnsweringProjectPaths(queuedWorkItems: ReadonlyArray<LocalAgentRunnerWorkItem>): Set<string> {
        return new Set([
            ...Array.from(this.activeMessageTasksByKey.values()).map(
                (activeMessageTask) => activeMessageTask.projectPath,
            ),
            ...queuedWorkItems.map((queuedWorkItem) => queuedWorkItem.projectSummary.project.projectPath),
        ]);
    }

    /**
     * Starts selected queued-message harness tasks and records them until they settle.
     */
    public startQueuedWorkItems(options: {
        readonly queuedWorkItems: ReadonlyArray<LocalAgentRunnerWorkItem>;
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly answeringProjectPaths: ReadonlySet<string>;
        readonly ignoredAgentCount: number;
        readonly autoPullResult: MultiAgentAutoPullResult;
    }): void {
        for (const queuedWorkItem of options.queuedWorkItems) {
            this.startQueuedWorkItem({
                queuedWorkItem,
                projectSummaries: options.projectSummaries,
                answeringProjectPaths: options.answeringProjectPaths,
                ignoredAgentCount: options.ignoredAgentCount,
                autoPullResult: options.autoPullResult,
            });
        }
    }

    /**
     * Waits for either one active task to finish or the next queue polling interval.
     */
    public async waitForNextTurn(queuePollIntervalMs: number): Promise<void> {
        if (this.activeMessageTasksByKey.size === 0) {
            return;
        }

        await Promise.race([
            ...Array.from(this.activeMessageTasksByKey.values()).map((activeMessageTask) => activeMessageTask.promise),
            wait(queuePollIntervalMs),
        ]);
    }

    /**
     * Preserves previous shutdown behavior by letting active harness tasks finish before returning.
     */
    public async waitForActiveTasksToSettle(): Promise<void> {
        await Promise.allSettled(
            Array.from(this.activeMessageTasksByKey.values()).map((activeMessageTask) => activeMessageTask.promise),
        );
    }

    private startQueuedWorkItem(options: {
        readonly queuedWorkItem: LocalAgentRunnerWorkItem;
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly answeringProjectPaths: ReadonlySet<string>;
        readonly ignoredAgentCount: number;
        readonly autoPullResult: MultiAgentAutoPullResult;
    }): void {
        const { queuedWorkItem } = options;
        const projectPath = queuedWorkItem.projectSummary.project.projectPath;
        const messageKey = this.createTaskKey(projectPath, queuedWorkItem.queuedMessage);
        const promise = this.runQueuedWorkItem({
            queuedWorkItem,
            projectSummaries: options.projectSummaries,
            answeringProjectPaths: options.answeringProjectPaths,
            ignoredAgentCount: options.ignoredAgentCount,
            autoPullResult: options.autoPullResult,
        }).finally(() => {
            this.activeMessageTasksByKey.delete(messageKey);
        });

        this.activeMessageTasksByKey.set(messageKey, {
            projectPath,
            queuedMessage: queuedWorkItem.queuedMessage,
            promise,
        });
    }

    private async runQueuedWorkItem(options: {
        readonly queuedWorkItem: LocalAgentRunnerWorkItem;
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly answeringProjectPaths: ReadonlySet<string>;
        readonly ignoredAgentCount: number;
        readonly autoPullResult: MultiAgentAutoPullResult;
    }): Promise<void> {
        const projectPath = options.queuedWorkItem.projectSummary.project.projectPath;

        try {
            const tickRunOptions = this.createRunOptionsForQueuedProjectTick({
                isProjectPulledInCurrentIteration: options.autoPullResult.pulledProjectPaths.has(projectPath),
            });
            const tickResult = await tickAgentMessages(tickRunOptions, {
                isQuietWhenIdle: true,
                projectPath,
                queuedMessage: options.queuedWorkItem.queuedMessage,
                uiHandle: this.options.uiPresenter.uiHandle,
                uiPresentation: this.options.uiPresenter.uiHandle
                    ? this.options.uiPresenter.buildTickPresentation({
                          projectSummaries: options.projectSummaries,
                          answeringProjectPaths: options.answeringProjectPaths,
                          ignoredAgentCount: options.ignoredAgentCount,
                      })
                    : undefined,
            });

            if (tickResult.autoPullTimestamp !== undefined) {
                this.options.autoPuller.recordAutoPullTimestamp(projectPath, tickResult.autoPullTimestamp);
            }

            if (tickResult.isMessageProcessed) {
                this.options.messageFailureTracker.clearMessageFailure(projectPath, tickResult.queuedMessage);
            }
        } catch (error) {
            await handleAgentWatchError({
                commandDisplayName: 'ptbk agent-folder run-multiple',
                logDirectoryPath: this.options.watchErrorLogDirectoryPath,
                error,
            });
            await this.options.messageFailureTracker.recordFailure(error);
        }
    }

    private selectFirstInactiveQueuedWorkItem(
        projectSummary: LocalAgentRunnerProjectSummary,
    ): LocalAgentRunnerWorkItem | null {
        const queuedMessage = projectSummary.queuedMessages.find(
            (message) =>
                !this.activeMessageTasksByKey.has(this.createTaskKey(projectSummary.project.projectPath, message)),
        );

        return queuedMessage ? { projectSummary, queuedMessage } : null;
    }

    private createTaskKey(projectPath: string, queuedMessage: AgentMessageFile): string {
        return `${projectPath}\0${queuedMessage.relativePath}`;
    }

    private createRunOptionsForQueuedProjectTick(options: {
        readonly isProjectPulledInCurrentIteration: boolean;
    }): AgentRunOptions {
        if (!options.isProjectPulledInCurrentIteration) {
            return this.options.runOptions;
        }

        return {
            ...this.options.runOptions,
            autoPull: false,
        };
    }

    private normalizeMaxParallelMessageCount(rawValue: number | undefined): number {
        const parsedValue = Number(rawValue);

        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            return Number.POSITIVE_INFINITY;
        }

        return Math.floor(parsedValue);
    }
}
