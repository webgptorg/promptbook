import colors from 'colors';
import moment from 'moment';
import { relative } from 'path';
import { just } from '../../../src/utils/organization/just';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import type { AgentRunOptions } from '../AgentRunOptions';
import { createCoderRunOptionsForAgent } from './createCoderRunOptionsForAgent';
import { listLocalAgentRunnerProjects, type LocalAgentRunnerProject } from './listLocalAgentRunnerProjects';
import { loadAgentMessageQueueSnapshot } from './loadAgentMessageQueueSnapshot';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { synchronizeGithubAgentRunnerRepositories } from './synchronizeGithubAgentRunnerRepositories';
import { shouldRunPeriodicTask } from './shouldRunPeriodicTask';
import { tickAgentMessages } from './tickAgentMessages';
import { validateAgentRunOptions } from './validateAgentRunOptions';
import { validateAgentWatchOptions } from './validateAgentWatchOptions';
import { withCurrentWorkingDirectory } from './withCurrentWorkingDirectory';
import { readLocalAgentName } from '../ui/loadAgentRunUiMetadata';
import { buildAgentRunUiFrame } from '../ui/buildAgentRunUiFrame';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';

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
 * Direct child repository summary rendered in the shared multi-agent dashboard.
 */
type LocalAgentRunnerProjectSummary = {
    readonly project: LocalAgentRunnerProject;
    readonly localAgentName: string;
    readonly queuedMessageCount: number;
    readonly finishedMessageCount: number;
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
    let githubSynchronizationTimestamp: number | undefined;
    const autoPullTimestampsByProjectPath = new Map<string, number>();
    let lastObservedProjectCount = 0;

    if (!uiHandle) {
        console.info(colors.green('Watching direct child agent repositories for queued messages.'));
    }

    while (shouldContinue()) {
        githubSynchronizationTimestamp = await synchronizeGithubAgentRunnerRepositoriesIfNeeded({
            rootPath,
            runOptions: options,
            uiHandle,
            lastSynchronizationTimestamp: githubSynchronizationTimestamp,
            lastObservedProjectCount,
        });

        let projectSummaries = await loadLocalAgentRunnerProjectSummaries(rootPath);
        lastObservedProjectCount = projectSummaries.length;
        const autoPullResult = await pullLatestChangesForLocalAgentRunnerProjectsIfNeeded({
            rootPath,
            runOptions: options,
            uiHandle,
            projectSummaries,
            autoPullTimestampsByProjectPath,
        });

        if (autoPullResult.isAnyRepositoryPulled) {
            projectSummaries = await loadLocalAgentRunnerProjectSummaries(rootPath);
            lastObservedProjectCount = projectSummaries.length;
        }

        const nextQueuedProject = projectSummaries.find((projectSummary) => projectSummary.queuedMessageCount > 0);

        if (!nextQueuedProject) {
            updateMultipleAgentRunUiForWatching(uiHandle, options, rootPath, projectSummaries);
            await wait(MULTI_AGENT_QUEUE_POLL_INTERVAL_MS);
            continue;
        }

        if (!uiHandle) {
            console.info(
                colors.blue(
                    `Processing ${formatProjectPath(rootPath, nextQueuedProject.project.projectPath)} with ${nextQueuedProject.localAgentName}.`,
                ),
            );
        }

        await withCurrentWorkingDirectory(nextQueuedProject.project.projectPath, async () => {
            const tickRunOptions = createAgentRunOptionsForQueuedProjectTick({
                runOptions: options,
                isProjectPulledInCurrentIteration: autoPullResult.pulledProjectPaths.has(
                    nextQueuedProject.project.projectPath,
                ),
            });
            const tickResult = await tickAgentMessages(tickRunOptions, { isQuietWhenIdle: true, uiHandle });

            if (tickResult.autoPullTimestamp !== undefined) {
                autoPullTimestampsByProjectPath.set(
                    nextQueuedProject.project.projectPath,
                    tickResult.autoPullTimestamp,
                );
            }
        });
    }
}

/**
 * Creates the shared multi-agent rich UI when the terminal supports it.
 */
async function initializeMultipleAgentRunUi(options: AgentRunOptions): Promise<CoderRunUiHandle | undefined> {
    if (options.noUi || !process.stdout.isTTY) {
        return undefined;
    }

    const sharedRunOptions = createCoderRunOptionsForAgent(options);
    const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);
    const uiHandle = renderCoderRunUi(moment(), { buildFrameLines: buildAgentRunUiFrame });

    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName: 'Multiple local agents',
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });

    return uiHandle;
}

/**
 * Synchronizes missing local repositories from GitHub when the owner configuration is available.
 */
async function synchronizeGithubAgentRunnerRepositoriesIfNeeded(options: {
    readonly rootPath: string;
    readonly runOptions: AgentRunOptions;
    readonly uiHandle?: CoderRunUiHandle;
    readonly lastSynchronizationTimestamp: number | undefined;
    readonly lastObservedProjectCount: number;
}): Promise<number | undefined> {
    const { rootPath, runOptions, uiHandle, lastSynchronizationTimestamp, lastObservedProjectCount } = options;

    if (!runOptions.autoClone) {
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
        uiHandle.state.setPhase('loading');
        uiHandle.state.setStatusMessage('Checking GitHub for new agent repositories');
        uiHandle.state.setDetailLines(['Refreshing configured `agent-*` repositories from GitHub when available.']);
    }

    const synchronizationResult = await synchronizeGithubAgentRunnerRepositories(rootPath);

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
    readonly autoPullTimestampsByProjectPath: Map<string, number>;
}): Promise<MultiAgentAutoPullResult> {
    const { rootPath, runOptions, uiHandle, projectSummaries, autoPullTimestampsByProjectPath } = options;
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
        const autoPullTimestamp = await withCurrentWorkingDirectory(projectPath, async () =>
            pullLatestChangesForAgentQueueIfEnabled({
                projectPath,
                runOptions,
                logMessage: uiHandle
                    ? undefined
                    : `Pulling latest changes in ${formatProjectPath(rootPath, projectPath)}...`,
            }),
        );

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
): Promise<ReadonlyArray<LocalAgentRunnerProjectSummary>> {
    const projects = await listLocalAgentRunnerProjects(rootPath);

    return await Promise.all(
        projects.map(async (project) => {
            const [localAgentName, queueSnapshot] = await Promise.all([
                readLocalAgentName(project.projectPath),
                loadAgentMessageQueueSnapshot(project.projectPath),
            ]);

            return {
                project,
                localAgentName,
                queuedMessageCount: queueSnapshot.queuedMessages.length,
                finishedMessageCount: queueSnapshot.finishedMessageCount,
            } satisfies LocalAgentRunnerProjectSummary;
        }),
    );
}

/**
 * Updates the shared UI to the idle multi-agent watch state.
 */
function updateMultipleAgentRunUiForWatching(
    uiHandle: CoderRunUiHandle | undefined,
    options: AgentRunOptions,
    rootPath: string,
    projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
): void {
    if (!uiHandle) {
        return;
    }

    const sharedRunOptions = createCoderRunOptionsForAgent(options);
    const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);
    const queuedMessageCount = projectSummaries.reduce(
        (totalQueuedMessages, projectSummary) => totalQueuedMessages + projectSummary.queuedMessageCount,
        0,
    );
    const finishedMessageCount = projectSummaries.reduce(
        (totalFinishedMessages, projectSummary) => totalFinishedMessages + projectSummary.finishedMessageCount,
        0,
    );

    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName: `${projectSummaries.length} served agent repositor${
            projectSummaries.length === 1 ? 'y' : 'ies'
        }`,
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });
    uiHandle.state.updateProgress({
        done: finishedMessageCount,
        forAgent: queuedMessageCount,
        belowMinimumPriority: 0,
        toBeWritten: 0,
    });
    uiHandle.state.setCurrentPrompt('');
    uiHandle.state.setPhase('waiting');
    uiHandle.state.setStatusMessage(
        projectSummaries.length > 0
            ? `Watching ${projectSummaries.length} direct child agent repositor${
                  projectSummaries.length === 1 ? 'y' : 'ies'
              }`
            : 'Watching for direct child agent repositories',
    );
    uiHandle.state.setDetailLines(buildMultiAgentWatchingDetailLines(rootPath, projectSummaries));
    uiHandle.state.setMessagePreviewLines(['Waiting for the next queued `MESSAGE @User`.']);
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
