import colors from 'colors';
import { just } from '../../../src/utils/organization/just';
import type { CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import type { AgentRunOptions } from '../AgentRunOptions';
import { createAgentIgnoreMatcher } from './agentIgnorePatterns';
import { AgentMessageFailureTracker } from './AgentMessageFailureTracker';
import { handleAgentWatchError } from './handleAgentWatchError';
import { loadLocalAgentRunnerProjectSummaries } from './runMultipleAgentMessages/loadLocalAgentRunnerProjectSummaries';
import { MultipleAgentAutoPuller } from './runMultipleAgentMessages/MultipleAgentAutoPuller';
import { MultipleAgentGithubSynchronizer } from './runMultipleAgentMessages/MultipleAgentGithubSynchronizer';
import { MultipleAgentRunUiPresenter } from './runMultipleAgentMessages/MultipleAgentRunUiPresenter';
import { RunMultipleAgentMessageTaskScheduler } from './runMultipleAgentMessages/RunMultipleAgentMessageTaskScheduler';
import { formatProjectPath } from './runMultipleAgentMessages/formatProjectPath';
import type { LocalAgentRunnerWorkItem } from './runMultipleAgentMessages/LocalAgentRunnerWorkItem';
import { wait } from './runMultipleAgentMessages/wait';
import { validateAgentRunOptions } from './validateAgentRunOptions';
import { validateAgentWatchOptions } from './validateAgentWatchOptions';

/**
 * Delay between multi-agent watch iterations while all queues stay empty.
 */
const MULTI_AGENT_QUEUE_POLL_INTERVAL_MS = 2_000;

/**
 * Optional integrations for callers that supervise the multi-agent watcher as one service.
 */
export type RunMultipleAgentMessagesControls = {
    readonly shouldContinue?: () => boolean;
    readonly queuePollIntervalMs?: number;
    readonly watchErrorLogDirectoryPath?: string;
    readonly onUiInitialized?: (uiHandle: CoderRunUiHandle | undefined) => void;
};

/**
 * Watches all direct child agent repositories from the current directory in one shared session.
 */
export async function runMultipleAgentMessages(
    options: AgentRunOptions,
    controls: RunMultipleAgentMessagesControls = {},
): Promise<void> {
    validateAgentRunOptions(options);
    validateAgentWatchOptions('ptbk agent-folder run-multiple', options);

    const rootPath = process.cwd();
    const shouldContinue = controls.shouldContinue || (() => just(true));
    const queuePollIntervalMs = controls.queuePollIntervalMs ?? MULTI_AGENT_QUEUE_POLL_INTERVAL_MS;
    const watchErrorLogDirectoryPath = controls.watchErrorLogDirectoryPath || rootPath;
    const ignoreMatcher = createAgentIgnoreMatcher(options.ignorePatterns);
    const githubSynchronizer = new MultipleAgentGithubSynchronizer();
    const autoPuller = new MultipleAgentAutoPuller();
    const messageFailureTracker = new AgentMessageFailureTracker({
        maxMessageProcessingFailures: options.maxMessageProcessingFailures,
    });
    let lastObservedProjectCount = 0;
    let isWatchSessionInitialized = false;
    let uiPresenter: MultipleAgentRunUiPresenter | undefined;
    let taskScheduler: RunMultipleAgentMessageTaskScheduler | undefined;

    while (shouldContinue()) {
        try {
            if (!isWatchSessionInitialized) {
                uiPresenter = MultipleAgentRunUiPresenter.create(options, rootPath);
                taskScheduler = new RunMultipleAgentMessageTaskScheduler({
                    runOptions: options,
                    messageFailureTracker,
                    autoPuller,
                    uiPresenter,
                    watchErrorLogDirectoryPath,
                });
                isWatchSessionInitialized = true;
                controls.onUiInitialized?.(uiPresenter.uiHandle);

                if (!uiPresenter.uiHandle) {
                    console.info(colors.green('Watching direct child agent repositories for queued messages.'));
                }
            }

            const currentUiPresenter = uiPresenter!;
            const currentTaskScheduler = taskScheduler!;

            await githubSynchronizer.synchronizeIfNeeded({
                rootPath,
                runOptions: options,
                ignoreMatcher,
                uiPresenter: currentUiPresenter,
                lastObservedProjectCount,
            });

            let projectSummariesResult = await loadLocalAgentRunnerProjectSummaries(rootPath, {
                includeMessagePreviews: Boolean(currentUiPresenter.uiHandle),
                ignoreMatcher,
            });
            let projectSummaries = projectSummariesResult.projectSummaries;
            lastObservedProjectCount = projectSummaries.length;
            let ignoredAgentCount = projectSummariesResult.ignoredProjectCount + githubSynchronizer.ignoredAgentCount;
            const autoPullResult =
                currentTaskScheduler.activeMessageCount === 0
                    ? await autoPuller.pullIfNeeded({
                          rootPath,
                          runOptions: options,
                          uiPresenter: currentUiPresenter,
                          projectSummaries,
                          ignoredAgentCount,
                      })
                    : {
                          isAnyRepositoryPulled: false,
                          pulledProjectPaths: new Set<string>(),
                      };

            if (autoPullResult.isAnyRepositoryPulled) {
                projectSummariesResult = await loadLocalAgentRunnerProjectSummaries(rootPath, {
                    includeMessagePreviews: Boolean(currentUiPresenter.uiHandle),
                    ignoreMatcher,
                });
                projectSummaries = projectSummariesResult.projectSummaries;
                lastObservedProjectCount = projectSummaries.length;
                ignoredAgentCount = projectSummariesResult.ignoredProjectCount + githubSynchronizer.ignoredAgentCount;
            }

            const queuedWorkItems = currentTaskScheduler.selectQueuedWorkItems(projectSummaries);
            const answeringProjectPaths = currentTaskScheduler.createAnsweringProjectPaths(queuedWorkItems);

            if (queuedWorkItems.length === 0 && currentTaskScheduler.activeMessageCount === 0) {
                currentUiPresenter.updateForWatching(projectSummaries, ignoredAgentCount);
                await wait(queuePollIntervalMs);
                continue;
            }

            if (queuedWorkItems.length === 0) {
                currentUiPresenter.updateForAnswering({
                    projectSummaries,
                    answeringProjectPaths,
                    ignoredAgentCount,
                    activeMessageCount: currentTaskScheduler.activeMessageCount,
                });
                await currentTaskScheduler.waitForNextTurn(queuePollIntervalMs);
                continue;
            }

            announceQueuedWorkItems(rootPath, currentUiPresenter, queuedWorkItems);
            currentUiPresenter.updateForAnswering({
                projectSummaries,
                answeringProjectPaths,
                ignoredAgentCount,
                activeMessageCount: currentTaskScheduler.activeMessageCount + queuedWorkItems.length,
            });
            currentTaskScheduler.startQueuedWorkItems({
                queuedWorkItems,
                projectSummaries,
                answeringProjectPaths,
                ignoredAgentCount,
                autoPullResult,
            });

            await currentTaskScheduler.waitForNextTurn(queuePollIntervalMs);
        } catch (error) {
            await handleAgentWatchError({
                commandDisplayName: 'ptbk agent-folder run-multiple',
                logDirectoryPath: watchErrorLogDirectoryPath,
                error,
            });
            await messageFailureTracker.recordFailure(error);
            await wait(queuePollIntervalMs);
        }
    }

    await taskScheduler?.waitForActiveTasksToSettle();
}

/**
 * Prints queued work in legacy no-UI mode.
 *
 * @private function of `runMultipleAgentMessages`
 */
function announceQueuedWorkItems(
    rootPath: string,
    uiPresenter: MultipleAgentRunUiPresenter,
    queuedWorkItems: ReadonlyArray<LocalAgentRunnerWorkItem>,
): void {
    if (uiPresenter.uiHandle) {
        return;
    }

    for (const queuedWorkItem of queuedWorkItems) {
        console.info(
            colors.blue(
                `Processing ${formatProjectPath(rootPath, queuedWorkItem.projectSummary.project.projectPath)}/${
                    queuedWorkItem.queuedMessage.relativePath
                } with ${queuedWorkItem.projectSummary.localAgentName}.`,
            ),
        );
    }
}
