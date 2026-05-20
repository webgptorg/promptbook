import colors from 'colors';
import moment from 'moment';
import { relative } from 'path';
import { just } from '../../../src/utils/organization/just';
import type {
    AgentRunMessagePreviewSection,
    AgentRunStatusTableRow,
} from '../../run-codex-prompts/ui/buildCoderRunUiFrame';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import type { PromptStats } from '../../run-codex-prompts/prompts/types/PromptStats';
import type { AgentRunOptions } from '../AgentRunOptions';
import { createCoderRunOptionsForAgent } from './createCoderRunOptionsForAgent';
import { listLocalAgentRunnerProjects, type LocalAgentRunnerProject } from './listLocalAgentRunnerProjects';
import { loadAgentMessageQueueSnapshot } from './loadAgentMessageQueueSnapshot';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { synchronizeGithubAgentRunnerRepositories } from './synchronizeGithubAgentRunnerRepositories';
import { shouldRunPeriodicTask } from './shouldRunPeriodicTask';
import { tickAgentMessages, type AgentTickUiPresentation } from './tickAgentMessages';
import { validateAgentRunOptions } from './validateAgentRunOptions';
import { validateAgentWatchOptions } from './validateAgentWatchOptions';
import {
    loadAgentRunQueuedMessagePreview,
    readLocalAgentUiIdentity,
    type AgentRunQueuedMessagePreview,
} from '../ui/loadAgentRunUiMetadata';
import { buildAgentRunUiFrame } from '../ui/buildAgentRunUiFrame';
import { WAITING_FOR_MESSAGE_LABEL } from '../ui/agentRunUiConstants';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';
import { buildAgentMessageScriptPath } from '../messages/buildAgentMessageScriptPath';
import {
    createAgentIgnoreMatcher,
    resolveAgentIdFromRepositoryName,
    type AgentIgnoreMatcher,
} from './agentIgnorePatterns';

/**
 * Delay between multi-agent watch iterations while all queues stay empty.
 */
const MULTI_AGENT_QUEUE_POLL_INTERVAL_MS = 2_000;

/**
 * Delay between GitHub owner synchronization rounds while the multi-agent runner stays active.
 */
const MULTI_AGENT_GITHUB_SYNC_INTERVAL_MS = 30_000;

/**
 * Delay between GitHub owner synchronization rounds while no local repositories exist yet.
 */
const MULTI_AGENT_EMPTY_DIRECTORY_GITHUB_SYNC_INTERVAL_MS = MULTI_AGENT_QUEUE_POLL_INTERVAL_MS;

/**
 * Delay between idle auto-pull rounds for each watched child repository.
 */
const MULTI_AGENT_IDLE_AUTO_PULL_INTERVAL_MS = 30_000;

/**
 * Visible width reserved for the legacy status-word column in plain status lines.
 */
const LEGACY_STATUS_WIDTH = 9;

/**
 * Direct child repository summary rendered in the shared multi-agent dashboard.
 */
type LocalAgentRunnerProjectSummary = {
    readonly project: LocalAgentRunnerProject;
    readonly localAgentName: string;
    readonly localAgentUrl: string;
    readonly queuedMessageCount: number;
    readonly finishedMessageCount: number;
    readonly queuedMessagePreview?: AgentRunQueuedMessagePreview;
};

/**
 * Local watched and ignored project summaries resolved in one directory scan.
 */
type LocalAgentRunnerProjectSummariesResult = {
    readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
    readonly ignoredProjectCount: number;
};

/**
 * Result of one multi-repository auto-pull round.
 */
type MultiAgentAutoPullResult = {
    readonly isAnyRepositoryPulled: boolean;
    readonly pulledProjectPaths: ReadonlySet<string>;
};

/**
 * Watches all direct child agent repositories from the current directory in one shared session.
 */
export async function runMultipleAgentMessages(
    options: AgentRunOptions,
    controls: {
        readonly shouldContinue?: () => boolean;
    } = {},
): Promise<void> {
    validateAgentRunOptions(options);
    validateAgentWatchOptions('ptbk agent run-multiple', options);

    const rootPath = process.cwd();
    const shouldContinue = controls.shouldContinue || (() => just(true));
    const uiHandle = await initializeMultipleAgentRunUi(options);
    const ignoreMatcher = createAgentIgnoreMatcher(options.ignorePatterns);
    let githubSynchronizationTimestamp: number | undefined;
    let githubIgnoredRepositoryCount = 0;
    const autoPullTimestampsByProjectPath = new Map<string, number>();
    let lastObservedProjectCount = 0;

    if (!uiHandle) {
        console.info(colors.green('Watching direct child agent repositories for queued messages.'));
    }

    while (shouldContinue()) {
        githubSynchronizationTimestamp = await synchronizeGithubAgentRunnerRepositoriesIfNeeded({
            rootPath,
            runOptions: options,
            ignoreMatcher,
            uiHandle,
            lastSynchronizationTimestamp: githubSynchronizationTimestamp,
            onIgnoredRepositoryCountUpdated: (ignoredRepositoryCount) => {
                githubIgnoredRepositoryCount = ignoredRepositoryCount;
            },
            lastObservedProjectCount,
        });

        let projectSummariesResult = await loadLocalAgentRunnerProjectSummaries(rootPath, {
            includeMessagePreviews: Boolean(uiHandle),
            ignoreMatcher,
        });
        let projectSummaries = projectSummariesResult.projectSummaries;
        lastObservedProjectCount = projectSummaries.length;
        let ignoredAgentCount = projectSummariesResult.ignoredProjectCount + githubIgnoredRepositoryCount;
        const autoPullResult = await pullLatestChangesForLocalAgentRunnerProjectsIfNeeded({
            rootPath,
            runOptions: options,
            uiHandle,
            projectSummaries,
            ignoredAgentCount,
            autoPullTimestampsByProjectPath,
        });

        if (autoPullResult.isAnyRepositoryPulled) {
            projectSummariesResult = await loadLocalAgentRunnerProjectSummaries(rootPath, {
                includeMessagePreviews: Boolean(uiHandle),
                ignoreMatcher,
            });
            projectSummaries = projectSummariesResult.projectSummaries;
            lastObservedProjectCount = projectSummaries.length;
            ignoredAgentCount = projectSummariesResult.ignoredProjectCount + githubIgnoredRepositoryCount;
        }

        const queuedProjects = projectSummaries.filter((projectSummary) => projectSummary.queuedMessageCount > 0);

        if (queuedProjects.length === 0) {
            updateMultipleAgentRunUiForWatching(uiHandle, options, rootPath, projectSummaries, ignoredAgentCount);
            await wait(MULTI_AGENT_QUEUE_POLL_INTERVAL_MS);
            continue;
        }

        if (!uiHandle) {
            for (const queuedProject of queuedProjects) {
                console.info(
                    colors.blue(
                        `Processing ${formatProjectPath(rootPath, queuedProject.project.projectPath)} with ${queuedProject.localAgentName}.`,
                    ),
                );
            }
        }

        const answeringProjectPaths = new Set(queuedProjects.map((queuedProject) => queuedProject.project.projectPath));

        if (uiHandle) {
            updateMultipleAgentRunUiForAnswering(
                uiHandle,
                options,
                rootPath,
                projectSummaries,
                answeringProjectPaths,
                ignoredAgentCount,
            );
        }

        const tickResults = await Promise.all(
            queuedProjects.map(async (queuedProject) => {
                const tickRunOptions = createAgentRunOptionsForQueuedProjectTick({
                    runOptions: options,
                    isProjectPulledInCurrentIteration: autoPullResult.pulledProjectPaths.has(
                        queuedProject.project.projectPath,
                    ),
                });
                const tickResult = await tickAgentMessages(tickRunOptions, {
                    isQuietWhenIdle: true,
                    projectPath: queuedProject.project.projectPath,
                    uiHandle,
                    uiPresentation: uiHandle
                        ? buildMultiAgentTickUiPresentation({
                              rootPath,
                              projectSummaries,
                              answeringProjectPaths,
                              ignoredAgentCount,
                          })
                        : undefined,
                });

                return {
                    projectPath: queuedProject.project.projectPath,
                    tickResult,
                };
            }),
        );

        for (const { projectPath, tickResult } of tickResults) {
            if (tickResult.autoPullTimestamp !== undefined) {
                autoPullTimestampsByProjectPath.set(projectPath, tickResult.autoPullTimestamp);
            }
        }
    }
}

/**
 * Creates the shared multi-agent rich UI when the terminal supports it.
 */
async function initializeMultipleAgentRunUi(options: AgentRunOptions): Promise<CoderRunUiHandle | undefined> {
    if (options.noUi || !process.stdout.isTTY) {
        return undefined;
    }

    const uiHandle = renderCoderRunUi(moment(), { buildFrameLines: buildAgentRunUiFrame });

    setMultipleAgentRunUiConfig(uiHandle, options, 0, 0);
    uiHandle.state.setAgentStatusLines(['No direct child agent repositories detected yet.']);
    uiHandle.state.setAgentStatusTableRows([]);
    uiHandle.state.setMessagePreviewSections([]);

    return uiHandle;
}

/**
 * Synchronizes missing local repositories from GitHub when the owner configuration is available.
 */
async function synchronizeGithubAgentRunnerRepositoriesIfNeeded(options: {
    readonly rootPath: string;
    readonly runOptions: AgentRunOptions;
    readonly ignoreMatcher: AgentIgnoreMatcher;
    readonly uiHandle?: CoderRunUiHandle;
    readonly lastSynchronizationTimestamp: number | undefined;
    readonly onIgnoredRepositoryCountUpdated: (ignoredRepositoryCount: number) => void;
    readonly lastObservedProjectCount: number;
}): Promise<number | undefined> {
    const {
        rootPath,
        runOptions,
        ignoreMatcher,
        uiHandle,
        lastSynchronizationTimestamp,
        onIgnoredRepositoryCountUpdated,
        lastObservedProjectCount,
    } = options;

    if (!runOptions.autoClone) {
        onIgnoredRepositoryCountUpdated(0);
        return lastSynchronizationTimestamp;
    }

    const synchronizationIntervalMs =
        lastObservedProjectCount === 0
            ? MULTI_AGENT_EMPTY_DIRECTORY_GITHUB_SYNC_INTERVAL_MS
            : MULTI_AGENT_GITHUB_SYNC_INTERVAL_MS;

    if (
        !shouldRunPeriodicTask({
            lastRunTimestamp: lastSynchronizationTimestamp,
            intervalMs: synchronizationIntervalMs,
        })
    ) {
        return lastSynchronizationTimestamp;
    }

    if (uiHandle) {
        setMultipleAgentRunUiConfig(uiHandle, runOptions, lastObservedProjectCount, 0);
        uiHandle.state.setPhase('loading');
        uiHandle.state.setStatusMessage('Checking GitHub for new agent repositories');
        uiHandle.state.setDetailLines(['Refreshing configured `agent-*` repositories from GitHub when available.']);
    }

    const synchronizationResult = await synchronizeGithubAgentRunnerRepositories(rootPath, { ignoreMatcher });
    onIgnoredRepositoryCountUpdated(synchronizationResult.ignoredRepositoryNames?.length || 0);

    if (!uiHandle && synchronizationResult.clonedRepositoryNames.length > 0) {
        console.info(
            colors.gray(
                `Cloned ${synchronizationResult.clonedRepositoryNames.length} new agent repositor${
                    synchronizationResult.clonedRepositoryNames.length === 1 ? 'y' : 'ies'
                }: ${synchronizationResult.clonedRepositoryNames.join(', ')}`,
            ),
        );
    }

    return synchronizationResult.synchronizedAt ?? lastSynchronizationTimestamp;
}

/**
 * Pulls latest changes for watched child repositories when their idle auto-pull interval elapsed.
 */
async function pullLatestChangesForLocalAgentRunnerProjectsIfNeeded(options: {
    readonly rootPath: string;
    readonly runOptions: AgentRunOptions;
    readonly uiHandle?: CoderRunUiHandle;
    readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
    readonly ignoredAgentCount: number;
    readonly autoPullTimestampsByProjectPath: Map<string, number>;
}): Promise<MultiAgentAutoPullResult> {
    const { rootPath, runOptions, uiHandle, projectSummaries, ignoredAgentCount, autoPullTimestampsByProjectPath } =
        options;
    const pulledProjectPaths = new Set<string>();

    if (!runOptions.autoPull || projectSummaries.length === 0) {
        return { isAnyRepositoryPulled: false, pulledProjectPaths };
    }

    pruneAutoPullTimestampsForCurrentProjects(autoPullTimestampsByProjectPath, projectSummaries);

    const projectSummariesToPull = projectSummaries.filter((projectSummary) =>
        shouldRunPeriodicTask({
            lastRunTimestamp: autoPullTimestampsByProjectPath.get(projectSummary.project.projectPath),
            intervalMs: MULTI_AGENT_IDLE_AUTO_PULL_INTERVAL_MS,
        }),
    );

    if (projectSummariesToPull.length === 0) {
        return { isAnyRepositoryPulled: false, pulledProjectPaths };
    }

    if (uiHandle) {
        setMultipleAgentRunUiConfig(uiHandle, runOptions, projectSummaries.length, ignoredAgentCount);
        uiHandle.state.updateProgress(createMultiAgentQueueProgressSnapshot(projectSummaries));
        uiHandle.state.setAgentStatusLines(buildMultiAgentStatusLines(rootPath, projectSummaries, new Set()));
        uiHandle.state.setAgentStatusTableRows(buildMultiAgentStatusTableRows(projectSummaries, new Set()));
        uiHandle.state.setPhase('loading');
        uiHandle.state.setStatusMessage('Pulling latest changes for watched repositories');
        uiHandle.state.setDetailLines(buildAutoPullDetailLines(rootPath, projectSummariesToPull));
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
            logMessage: uiHandle ? undefined : `Pulling latest changes in ${formatProjectPath(rootPath, projectPath)}...`,
        });

        if (autoPullTimestamp !== undefined) {
            autoPullTimestampsByProjectPath.set(projectPath, autoPullTimestamp);
            pulledProjectPaths.add(projectPath);
        }
    }

    return {
        isAnyRepositoryPulled: pulledProjectPaths.size > 0,
        pulledProjectPaths,
    };
}

/**
 * Removes idle auto-pull timestamps for directories that are no longer watched.
 */
function pruneAutoPullTimestampsForCurrentProjects(
    autoPullTimestampsByProjectPath: Map<string, number>,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
): void {
    const currentProjectPaths = new Set(projectSummaries.map((projectSummary) => projectSummary.project.projectPath));

    for (const projectPath of autoPullTimestampsByProjectPath.keys()) {
        if (!currentProjectPaths.has(projectPath)) {
            autoPullTimestampsByProjectPath.delete(projectPath);
        }
    }
}

/**
 * Builds the run options used for a queued project tick after the multi-runner may have already pulled that project.
 */
function createAgentRunOptionsForQueuedProjectTick(options: {
    readonly runOptions: AgentRunOptions;
    readonly isProjectPulledInCurrentIteration: boolean;
}): AgentRunOptions {
    const { runOptions, isProjectPulledInCurrentIteration } = options;

    if (!isProjectPulledInCurrentIteration) {
        return runOptions;
    }

    return {
        ...runOptions,
        autoPull: false,
    };
}

/**
 * Loads current direct-child repository summaries used by the shared dashboard and queue routing.
 */
async function loadLocalAgentRunnerProjectSummaries(
    rootPath: string,
    options: {
        readonly includeMessagePreviews: boolean;
        readonly ignoreMatcher: AgentIgnoreMatcher;
    },
): Promise<LocalAgentRunnerProjectSummariesResult> {
    const projects = await listLocalAgentRunnerProjects(rootPath);
    let ignoredProjectCount = 0;

    const projectSummaries = await Promise.all(
        projects.map(async (project) => {
            const localAgentIdentity = await readLocalAgentUiIdentity(project.projectPath);
            const isProjectIgnored = options.ignoreMatcher.isIgnored({
                agentName: localAgentIdentity.localAgentName,
                normalizedAgentName: localAgentIdentity.normalizedAgentName,
                agentId: localAgentIdentity.agentId || resolveAgentIdFromRepositoryName(project.directoryName),
                repositoryName: project.directoryName,
            });

            if (isProjectIgnored) {
                ignoredProjectCount++;
                return null;
            }

            const queueSnapshot = await loadAgentMessageQueueSnapshot(project.projectPath);
            const queuedMessagePreview =
                options.includeMessagePreviews && queueSnapshot.queuedMessages[0]
                    ? await loadAgentRunQueuedMessagePreview(queueSnapshot.queuedMessages[0])
                    : undefined;

            return {
                project,
                localAgentName: localAgentIdentity.localAgentName,
                localAgentUrl: localAgentIdentity.localAgentUrl || formatProjectPath(rootPath, project.projectPath),
                queuedMessageCount: queueSnapshot.queuedMessages.length,
                finishedMessageCount: queueSnapshot.finishedMessageCount,
                ...(queuedMessagePreview ? { queuedMessagePreview } : {}),
            } satisfies LocalAgentRunnerProjectSummary;
        }),
    );

    return {
        projectSummaries: projectSummaries.filter(
            (projectSummary): projectSummary is LocalAgentRunnerProjectSummary => projectSummary !== null,
        ),
        ignoredProjectCount,
    };
}

/**
 * Updates the shared UI to the idle multi-agent watch state.
 */
function updateMultipleAgentRunUiForWatching(
    uiHandle: CoderRunUiHandle | undefined,
    options: AgentRunOptions,
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    ignoredAgentCount: number,
): void {
    if (!uiHandle) {
        return;
    }

    setMultipleAgentRunUiConfig(uiHandle, options, projectSummaries.length, ignoredAgentCount);
    uiHandle.state.updateProgress(createMultiAgentQueueProgressSnapshot(projectSummaries));
    uiHandle.state.setCurrentPrompt('');
    uiHandle.state.setPhase('waiting');
    uiHandle.state.setStatusMessage(
        projectSummaries.length > 0 ? `Watching ${formatAgentCount(projectSummaries.length)}` : 'Watching for Agents',
    );
    uiHandle.state.setDetailLines(buildMultiAgentWatchingDetailLines(rootPath, projectSummaries));
    uiHandle.state.setAgentStatusLines(buildMultiAgentStatusLines(rootPath, projectSummaries, new Set()));
    uiHandle.state.setAgentStatusTableRows(buildMultiAgentStatusTableRows(projectSummaries, new Set()));
    uiHandle.state.setMessagePreviewLines([WAITING_FOR_MESSAGE_LABEL]);
    uiHandle.state.setMessagePreviewSections([]);
}

/**
 * Updates the shared UI while one or more child repositories are answering queued messages.
 */
function updateMultipleAgentRunUiForAnswering(
    uiHandle: CoderRunUiHandle,
    options: AgentRunOptions,
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
    ignoredAgentCount: number,
): void {
    const activeProjectCount = projectSummaries.filter((projectSummary) =>
        answeringProjectPaths.has(projectSummary.project.projectPath),
    ).length;

    setMultipleAgentRunUiConfig(uiHandle, options, projectSummaries.length, ignoredAgentCount);
    uiHandle.state.updateProgress(createMultiAgentQueueProgressSnapshot(projectSummaries));
    uiHandle.state.setCurrentPrompt('');
    uiHandle.state.setCurrentScriptPaths(buildMultiAgentScriptPaths(projectSummaries, answeringProjectPaths));
    uiHandle.state.setPhase('running');
    uiHandle.state.setStatusMessage(
        `Answering ${activeProjectCount} queued message${activeProjectCount === 1 ? '' : 's'}`,
    );
    uiHandle.state.setDetailLines(buildMultiAgentAnsweringDetailLines(rootPath, projectSummaries, answeringProjectPaths));
    uiHandle.state.setAgentStatusLines(buildMultiAgentStatusLines(rootPath, projectSummaries, answeringProjectPaths));
    uiHandle.state.setAgentStatusTableRows(buildMultiAgentStatusTableRows(projectSummaries, answeringProjectPaths));
    uiHandle.state.setMessagePreviewSections(
        buildMultiAgentMessagePreviewSections(projectSummaries, answeringProjectPaths),
    );
}

/**
 * Builds active temporary runner shell script paths for the shared multi-agent dashboard.
 */
function buildMultiAgentScriptPaths(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): string[] {
    return projectSummaries
        .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
        .map((projectSummary) =>
            projectSummary.queuedMessagePreview
                ? buildAgentMessageScriptPath(
                      projectSummary.project.projectPath,
                      projectSummary.queuedMessagePreview.queuedMessage,
                  )
                : undefined,
        )
        .filter((scriptPath): scriptPath is string => Boolean(scriptPath));
}

/**
 * Applies the shared runner configuration and concise agent count label.
 */
function setMultipleAgentRunUiConfig(
    uiHandle: CoderRunUiHandle,
    options: AgentRunOptions,
    agentCount: number,
    ignoredAgentCount: number,
): void {
    const sharedRunOptions = createCoderRunOptionsForAgent(options);
    const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);

    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName: formatAgentCount(agentCount, ignoredAgentCount),
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });
}

/**
 * Builds the multi-agent presentation passed into one active queued-message tick.
 */
function buildMultiAgentTickUiPresentation(options: {
    readonly rootPath: string;
    readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
    readonly answeringProjectPaths: ReadonlySet<string>;
    readonly ignoredAgentCount: number;
}): AgentTickUiPresentation {
    const { rootPath, projectSummaries, answeringProjectPaths, ignoredAgentCount } = options;

    return {
        isSharedDashboard: true,
        sessionAgentName: formatAgentCount(projectSummaries.length, ignoredAgentCount),
        agentStatusLines: buildMultiAgentStatusLines(rootPath, projectSummaries, answeringProjectPaths),
        agentStatusTableRows: buildMultiAgentStatusTableRows(projectSummaries, answeringProjectPaths),
        messagePreviewLines: buildMultiAgentUserMessageLines(projectSummaries, answeringProjectPaths),
        messagePreviewSections: buildMultiAgentMessagePreviewSections(projectSummaries, answeringProjectPaths),
        progressStats: createMultiAgentQueueProgressSnapshot(projectSummaries),
        completedAgentStatusLines: buildMultiAgentStatusLines(rootPath, projectSummaries, new Set()),
        completedAgentStatusTableRows: buildMultiAgentStatusTableRows(projectSummaries, new Set()),
        completedMessagePreviewLines: [WAITING_FOR_MESSAGE_LABEL],
        completedMessagePreviewSections: [],
        completedProgressStats: createCompletedMultiAgentQueueProgressSnapshot(projectSummaries, answeringProjectPaths),
    };
}

/**
 * Converts watched project summaries into the shared progress-stat shape.
 */
function createMultiAgentQueueProgressSnapshot(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
): PromptStats {
    return {
        done: projectSummaries.reduce(
            (totalFinishedMessages, projectSummary) => totalFinishedMessages + projectSummary.finishedMessageCount,
            0,
        ),
        forAgent: projectSummaries.reduce(
            (totalQueuedMessages, projectSummary) => totalQueuedMessages + projectSummary.queuedMessageCount,
            0,
        ),
        belowMinimumPriority: 0,
        toBeWritten: 0,
    };
}

/**
 * Predicts the aggregate queue stats after the current active message is answered.
 */
function createCompletedMultiAgentQueueProgressSnapshot(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): PromptStats {
    const activeAnsweringCount = projectSummaries.filter((projectSummary) =>
        answeringProjectPaths.has(projectSummary.project.projectPath),
    ).length;
    const progressStats = createMultiAgentQueueProgressSnapshot(projectSummaries);

    return {
        ...progressStats,
        done: progressStats.done + activeAnsweringCount,
        forAgent: Math.max(0, progressStats.forAgent - activeAnsweringCount),
    };
}

/**
 * Builds one readable status row per watched local agent repository.
 */
function buildMultiAgentStatusLines(
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): string[] {
    if (projectSummaries.length === 0) {
        return ['No direct child agent repositories detected yet.'];
    }

    return projectSummaries.map((projectSummary) => {
        const isAnswering = answeringProjectPaths.has(projectSummary.project.projectPath);
        const status = isAnswering ? 'Answering' : 'Idle';
        const currentMessage = isAnswering ? formatCurrentAgentMessage(projectSummary) : '';

        return `${status.padEnd(LEGACY_STATUS_WIDTH)} ${projectSummary.localAgentName} (${formatProjectPath(
            rootPath,
            projectSummary.project.projectPath,
        )})${currentMessage}`;
    });
}

/**
 * Builds one structured status-table row per watched local agent repository.
 */
function buildMultiAgentStatusTableRows(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): AgentRunStatusTableRow[] {
    return projectSummaries.map((projectSummary) => ({
        status: answeringProjectPaths.has(projectSummary.project.projectPath) ? 'Answering' : 'Idle',
        agentName: projectSummary.localAgentName,
        url: projectSummary.localAgentUrl,
    }));
}

/**
 * Builds the current-message summary appended to an answering agent status row.
 */
function formatCurrentAgentMessage(projectSummary: LocalAgentRunnerProjectSummary): string {
    if (!projectSummary.queuedMessagePreview) {
        return '';
    }

    return `  ·  ${projectSummary.queuedMessagePreview.queuedMessage.relativePath}: ${
        projectSummary.queuedMessagePreview.latestUserMessageSummary
    }`;
}

/**
 * Builds the user-message preview lines for all agents currently answering.
 */
function buildMultiAgentUserMessageLines(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): string[] {
    const answeringMessageLines = projectSummaries
        .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
        .flatMap((projectSummary) => buildAnsweringAgentMessageLines(projectSummary));

    return answeringMessageLines.length > 0
        ? answeringMessageLines
        : [WAITING_FOR_MESSAGE_LABEL];
}

/**
 * Builds one dedicated message-preview panel per answering agent.
 */
function buildMultiAgentMessagePreviewSections(
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): AgentRunMessagePreviewSection[] {
    return projectSummaries
        .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
        .map((projectSummary) => ({
            title: `User message: ${projectSummary.localAgentName}`,
            messagePreviewLines:
                projectSummary.queuedMessagePreview?.latestUserMessageLines.length
                    ? projectSummary.queuedMessagePreview.latestUserMessageLines
                    : [projectSummary.queuedMessagePreview?.queuedMessage.relativePath || WAITING_FOR_MESSAGE_LABEL],
        }));
}

/**
 * Builds line-preserving message preview rows for one answering agent.
 */
function buildAnsweringAgentMessageLines(projectSummary: LocalAgentRunnerProjectSummary): string[] {
    const messageLines = projectSummary.queuedMessagePreview?.latestUserMessageLines;

    if (!messageLines || messageLines.length === 0) {
        return [
            `${projectSummary.localAgentName}: ${
                projectSummary.queuedMessagePreview?.queuedMessage.relativePath || 'Queued message'
            }`,
        ];
    }

    const prefix = `${projectSummary.localAgentName}: `;
    const continuationPrefix = ' '.repeat(prefix.length);

    return messageLines.map((messageLine, lineIndex) =>
        lineIndex === 0 ? `${prefix}${messageLine}` : `${continuationPrefix}${messageLine}`,
    );
}

/**
 * Builds concise detail lines for the shared dashboard while multiple child repositories are answering.
 */
function buildMultiAgentAnsweringDetailLines(
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    answeringProjectPaths: ReadonlySet<string>,
): string[] {
    return projectSummaries
        .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
        .slice(0, 6)
        .map(
            (projectSummary) =>
                `${formatProjectPath(rootPath, projectSummary.project.projectPath)}  ·  ${
                    projectSummary.queuedMessagePreview?.queuedMessage.relativePath || 'Queued message'
                }`,
        );
}

/**
 * Formats the session-level count label used by multi-agent runs.
 */
function formatAgentCount(agentCount: number, ignoredAgentCount = 0): string {
    const agentCountLabel = `${agentCount} Agent${agentCount === 1 ? '' : 's'}`;

    if (ignoredAgentCount === 0) {
        return agentCountLabel;
    }

    return `${agentCountLabel}  ·  ${ignoredAgentCount} ignored`;
}

/**
 * Builds concise per-repository detail lines for the idle multi-agent dashboard.
 */
function buildMultiAgentWatchingDetailLines(
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
): string[] {
    const projectDetailLines = projectSummaries
        .slice(0, 6)
        .map(
            (projectSummary) =>
                `${formatProjectPath(rootPath, projectSummary.project.projectPath)}  ·  ${
                    projectSummary.localAgentName
                }  ·  ${projectSummary.queuedMessageCount} queued  ·  ${projectSummary.finishedMessageCount} finished`,
        );

    if (projectSummaries.length === 0) {
        return ['No direct child agent repositories detected yet.'];
    }

    if (projectSummaries.length > projectDetailLines.length) {
        projectDetailLines.push(
            `…and ${projectSummaries.length - projectDetailLines.length} more direct child repositories.`,
        );
    }

    return projectDetailLines;
}

/**
 * Builds concise detail lines for the shared dashboard while multiple child repositories are being pulled.
 */
function buildAutoPullDetailLines(
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
): string[] {
    const projectDetailLines = projectSummaries
        .slice(0, 6)
        .map((projectSummary) => `Pulling ${formatProjectPath(rootPath, projectSummary.project.projectPath)}`);

    if (projectSummaries.length > projectDetailLines.length) {
        projectDetailLines.push(
            `…and ${projectSummaries.length - projectDetailLines.length} more direct child repositories.`,
        );
    }

    return projectDetailLines;
}

/**
 * Formats one child project path for stable console and UI output.
 */
function formatProjectPath(rootPath: string, projectPath: string): string {
    return relative(rootPath, projectPath).replace(/\\/gu, '/');
}

/**
 * Waits for the next idle poll interval in multi-agent watch mode.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
