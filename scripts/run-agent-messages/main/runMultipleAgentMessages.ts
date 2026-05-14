import colors from 'colors';
import moment from 'moment';
import { relative } from 'path';
import { just } from '../../../src/utils/organization/just';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import type { AgentRunOptions } from '../AgentRunOptions';
import { createCoderRunOptionsForAgent } from './createCoderRunOptionsForAgent';
import { listLocalAgentRunnerProjects, type LocalAgentRunnerProject } from './listLocalAgentRunnerProjects';
import { loadAgentMessageQueueSnapshot } from './loadAgentMessageQueueSnapshot';
import { synchronizeGithubAgentRunnerRepositories } from './synchronizeGithubAgentRunnerRepositories';
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
 * Direct child repository summary rendered in the shared multi-agent dashboard.
 */
type LocalAgentRunnerProjectSummary = {
    readonly project: LocalAgentRunnerProject;
    readonly localAgentName: string;
    readonly queuedMessageCount: number;
    readonly finishedMessageCount: number;
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

    if (!uiHandle) {
        console.info(colors.green('Watching direct child agent repositories for queued messages.'));
    }

    while (shouldContinue()) {
        githubSynchronizationTimestamp = await synchronizeGithubAgentRunnerRepositoriesIfNeeded({
            rootPath,
            uiHandle,
            lastSynchronizationTimestamp: githubSynchronizationTimestamp,
        });

        const projectSummaries = await loadLocalAgentRunnerProjectSummaries(rootPath);
        const nextQueuedProject = projectSummaries.find((projectSummary) => projectSummary.queuedMessageCount > 0);

        if (!nextQueuedProject) {
            updateMultipleAgentRunUiForWatching(uiHandle, options, rootPath, projectSummaries);
            await wait(MULTI_AGENT_QUEUE_POLL_INTERVAL_MS);
            continue;
        }

        if (!uiHandle) {
            console.info(
                colors.blue(
                    `Processing ${relative(rootPath, nextQueuedProject.project.projectPath).replace(
                        /\\/gu,
                        '/',
                    )} with ${nextQueuedProject.localAgentName}.`,
                ),
            );
        }

        await withCurrentWorkingDirectory(nextQueuedProject.project.projectPath, async () => {
            await tickAgentMessages(options, { isQuietWhenIdle: true, uiHandle });
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
    readonly uiHandle?: CoderRunUiHandle;
    readonly lastSynchronizationTimestamp: number | undefined;
}): Promise<number | undefined> {
    const { rootPath, uiHandle, lastSynchronizationTimestamp } = options;

    if (
        lastSynchronizationTimestamp !== undefined &&
        Date.now() - lastSynchronizationTimestamp < MULTI_AGENT_GITHUB_SYNC_INTERVAL_MS
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
                `${relative(rootPath, projectSummary.project.projectPath).replace(/\\/gu, '/')}  ·  ${
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
 * Waits for the next idle poll interval in multi-agent watch mode.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
