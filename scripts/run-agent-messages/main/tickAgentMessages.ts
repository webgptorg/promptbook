import moment from 'moment';
import colors from 'colors';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createAgentModelRequirements } from '../../../src/book-2.0/agent-source/createAgentModelRequirements';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { AGENT_BOOK_FILE_PATH } from '../../../src/cli/cli-commands/agent-folder/agentProjectPaths';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../../run-codex-prompts/common/normalizeLineEndingsInChangedFiles';
import { buildScriptLogPath } from '../../run-codex-prompts/common/runGoScript/buildScriptLogPath';
import { withPromptRuntimeLog } from '../../run-codex-prompts/common/runGoScript/withPromptRuntimeLog';
import { printAgentGitIdentityTipAtProcessExitIfNeeded } from '../../run-codex-prompts/git/agentGitIdentity';
import { commitChanges } from '../../run-codex-prompts/git/commitChanges';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';
import type { PromptRunner } from '../../run-codex-prompts/runners/types/PromptRunner';
import type { PromptStats } from '../../run-codex-prompts/prompts/types/PromptStats';
import { runPromptWithTestFeedback } from '../../run-codex-prompts/testing/runPromptWithTestFeedback';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import type {
    AgentRunMessagePreviewSection,
    AgentRunStatusTableRow,
} from '../../run-codex-prompts/ui/buildCoderRunUiFrame';
import type { AgentRunOptions } from '../AgentRunOptions';
import { isGitPathTracked } from '../git/isGitPathTracked';
import type { AgentMessageFile } from '../messages/AgentMessageFile';
import { buildAgentMessageCommitMessage } from '../messages/buildAgentMessageCommitMessage';
import { buildAgentMessagePrompt } from '../messages/buildAgentMessagePrompt';
import { buildAgentMessageScriptPath } from '../messages/buildAgentMessageScriptPath';
import { moveAgentMessageToFinished, type FinishedAgentMessageFile } from '../messages/moveAgentMessageToFinished';
import {
    createAgentQueueProgressSnapshot,
    loadAgentMessageQueueSnapshot,
    type AgentMessageQueueSnapshot,
} from './loadAgentMessageQueueSnapshot';
import { buildAgentRunUiFrame } from '../ui/buildAgentRunUiFrame';
import { loadAgentRunUiMetadata } from '../ui/loadAgentRunUiMetadata';
import { updateAgentRunUiForPulling, updateAgentRunUiForWatching } from '../ui/initializeAgentRunUi';
import { createCoderRunOptionsForAgent } from './createCoderRunOptionsForAgent';
import { withAgentWatchErrorContext } from './handleAgentWatchError';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { validateAgentRunOptions } from './validateAgentRunOptions';

/**
 * Result of one `ptbk agent-folder run-once` invocation.
 */
export type AgentTickResult = {
    readonly isMessageProcessed: boolean;
    readonly autoPullTimestamp?: number;
    readonly queuedMessage?: AgentMessageFile;
    readonly finishedMessage?: FinishedAgentMessageFile;
};

/**
 * Runtime controls for one agent tick.
 */
export type TickAgentMessagesOptions = {
    readonly isQuietWhenIdle?: boolean;
    readonly projectPath?: string;
    readonly uiHandle?: CoderRunUiHandle;
    readonly uiPresentation?: AgentTickUiPresentation;
};

/**
 * Optional rich UI presentation overrides used by shared multi-agent sessions.
 */
export type AgentTickUiPresentation = {
    readonly isSharedDashboard?: boolean;
    readonly sessionAgentName?: string;
    readonly agentStatusLines?: readonly string[];
    readonly agentStatusTableRows?: readonly AgentRunStatusTableRow[];
    readonly messagePreviewLines?: readonly string[];
    readonly messagePreviewSections?: readonly AgentRunMessagePreviewSection[];
    readonly progressStats?: PromptStats;
    readonly completedAgentStatusLines?: readonly string[];
    readonly completedAgentStatusTableRows?: readonly AgentRunStatusTableRow[];
    readonly completedMessagePreviewLines?: readonly string[];
    readonly completedMessagePreviewSections?: readonly AgentRunMessagePreviewSection[];
    readonly completedProgressStats?: PromptStats;
};

/**
 * Answers one queued `.book` message thread and moves it to `messages/finished`.
 */
export async function tickAgentMessages(
    options: AgentRunOptions,
    tickOptions: TickAgentMessagesOptions = {},
): Promise<AgentTickResult> {
    validateAgentRunOptions(options);

    const projectPath = tickOptions.projectPath || process.cwd();
    let queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);
    let queuedMessage = queueSnapshot.queuedMessages[0];

    if (!queuedMessage) {
        announceNoQueuedMessages(tickOptions);
        return { isMessageProcessed: false };
    }

    if (tickOptions.uiHandle && !tickOptions.uiPresentation?.isSharedDashboard) {
        updateAgentRunUiForPulling(
            tickOptions.uiHandle,
            queueSnapshot,
            'Pulling latest changes before answering the next message',
        );
    }

    const autoPullTimestamp = await pullLatestChangesForAgentQueueIfEnabled({
        projectPath,
        runOptions: options,
        logMessage: tickOptions.uiHandle ? undefined : 'Pulling latest changes before answering the next message...',
    });

    if (autoPullTimestamp !== undefined) {
        queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);
        queuedMessage = queueSnapshot.queuedMessages[0];

        if (!queuedMessage) {
            if (tickOptions.uiHandle && !tickOptions.uiPresentation?.isSharedDashboard) {
                updateAgentRunUiForWatching(tickOptions.uiHandle, queueSnapshot);
            }
            announceNoQueuedMessages(tickOptions);
            return { isMessageProcessed: false, autoPullTimestamp };
        }
    }

    const sharedRunOptions = createCoderRunOptionsForAgent(options);
    const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);
    const agentUiMetadata = await loadAgentRunUiMetadata(projectPath, queuedMessage);
    const uiHandle = createAgentRunUiHandle(
        options,
        runner,
        actualRunnerModel,
        queuedMessage,
        queueSnapshot,
        agentUiMetadata,
        tickOptions.uiPresentation,
        tickOptions.uiHandle,
    );

    try {
        const finishedMessage = await runQueuedAgentMessage({
            projectPath,
            options,
            runner,
            queuedMessage,
            uiHandle,
            isSharedDashboard: tickOptions.uiPresentation?.isSharedDashboard,
        });

        if (!tickOptions.uiPresentation?.isSharedDashboard) {
            uiHandle?.state.updateProgress(
                tickOptions.uiPresentation?.completedProgressStats ||
                    createAgentQueueProgressSnapshot({
                        finishedMessageCount: queueSnapshot.finishedMessageCount + 1,
                        queuedMessages: queueSnapshot.queuedMessages.slice(1),
                    }),
            );
            if (tickOptions.uiPresentation?.completedAgentStatusLines) {
                uiHandle?.state.setAgentStatusLines([...tickOptions.uiPresentation.completedAgentStatusLines]);
            }
            if (tickOptions.uiPresentation?.completedAgentStatusTableRows) {
                uiHandle?.state.setAgentStatusTableRows([...tickOptions.uiPresentation.completedAgentStatusTableRows]);
            }
            if (tickOptions.uiPresentation?.completedMessagePreviewLines) {
                uiHandle?.state.setMessagePreviewLines([...tickOptions.uiPresentation.completedMessagePreviewLines]);
            }
            if (tickOptions.uiPresentation?.completedMessagePreviewSections) {
                uiHandle?.state.setMessagePreviewSections([...tickOptions.uiPresentation.completedMessagePreviewSections]);
            }
            uiHandle?.state.setStatusMessage('Message answered');
            uiHandle?.state.setPhase('done');
        }

        return {
            isMessageProcessed: true,
            autoPullTimestamp,
            queuedMessage,
            finishedMessage,
        };
    } catch (error) {
        const contextualError = withAgentWatchErrorContext(error, {
            projectPath,
            queuedMessageRelativePath: queuedMessage.relativePath,
        });
        uiHandle?.state.setPhase('error');
        uiHandle?.state.addError(contextualError.message);
        throw contextualError;
    } finally {
        if (!tickOptions.uiHandle) {
            uiHandle?.cleanup();
        }
        printAgentGitIdentityTipAtProcessExitIfNeeded();
    }
}

/**
 * Runs the selected coding runner for one message and finalizes the answered file.
 */
async function runQueuedAgentMessage(options: {
    readonly projectPath: string;
    readonly options: AgentRunOptions;
    readonly runner: PromptRunner;
    readonly queuedMessage: AgentMessageFile;
    readonly uiHandle?: CoderRunUiHandle;
    readonly isSharedDashboard?: boolean;
}): Promise<FinishedAgentMessageFile> {
    const { projectPath, options: runOptions, runner, queuedMessage, uiHandle, isSharedDashboard } = options;
    const agentSystemMessage = await loadLocalAgentSystemMessage(projectPath);
    const prompt = buildAgentMessagePrompt(queuedMessage.relativePath, agentSystemMessage);
    const scriptPath = buildAgentMessageScriptPath(projectPath, queuedMessage);
    const runtimeLogPath = buildScriptLogPath(scriptPath);
    const roundChangedFilesSnapshot = runOptions.normalizeLineEndings
        ? await captureChangedFilesSnapshot(projectPath)
        : undefined;
    const isQueuedMessageTracked = await isGitPathTracked(projectPath, queuedMessage.relativePath);

    if (!uiHandle) {
        console.info(colors.blue(`Processing ${queuedMessage.relativePath}`));
    }

    if (!isSharedDashboard) {
        uiHandle?.state.setPhase('running');
        uiHandle?.state.setStatusMessage('Running');
    }
    if (!isSharedDashboard) {
        uiHandle?.state.setCurrentScriptPath(scriptPath);
    }
    uiHandle?.startCapturingAgentOutput();

    try {
        try {
            await withPromptRuntimeLog(
                scriptPath,
                async (logPath) => {
                    await runPromptWithTestFeedback({
                        runner,
                        prompt,
                        scriptPath,
                        projectPath,
                        promptLabel: queuedMessage.relativePath,
                        logPath,
                        preserveArtifactsOnSuccess: false,
                        onAttemptStarted: (attemptCount) => {
                            uiHandle?.state.setAttempt(attemptCount);
                        },
                    });
                },
                { preserveArtifactsOnSuccess: false },
            );
        } catch (error) {
            throw withAgentWatchErrorContext(error, {
                projectPath,
                queuedMessageRelativePath: queuedMessage.relativePath,
                scriptPath,
                runtimeLogPath,
            });
        }
    } finally {
        uiHandle?.stopCapturingAgentOutput();
    }

    await normalizeLineEndingsForAgentRound(projectPath, runOptions, roundChangedFilesSnapshot);

    const finishedMessage = await moveAgentMessageToFinished(projectPath, queuedMessage);
    await commitAnsweredMessageIfEnabled({
        options: runOptions,
        queuedMessage,
        finishedMessage,
        isQueuedMessageTracked,
        uiHandle,
        isSharedDashboard,
        projectPath,
    });

    return finishedMessage;
}

/**
 * Compiles the local `agent.book` source into the system message passed to the coding runner.
 */
async function loadLocalAgentSystemMessage(projectPath: string): Promise<string> {
    const agentSource = await readFile(join(projectPath, AGENT_BOOK_FILE_PATH), 'utf-8');
    const modelRequirements = await createAgentModelRequirements(agentSource as string_book);

    return modelRequirements.systemMessage;
}

/**
 * Creates and seeds the rich terminal UI for an agent message run.
 */
function createAgentRunUiHandle(
    options: AgentRunOptions,
    runner: PromptRunner,
    actualRunnerModel: string | undefined,
    queuedMessage: AgentMessageFile,
    queueSnapshot: AgentMessageQueueSnapshot,
    agentUiMetadata: Awaited<ReturnType<typeof loadAgentRunUiMetadata>>,
    uiPresentation: AgentTickUiPresentation | undefined,
    externalUiHandle?: CoderRunUiHandle,
): CoderRunUiHandle | undefined {
    if (externalUiHandle) {
        seedAgentRunUiHandle(
            externalUiHandle,
            options,
            runner,
            actualRunnerModel,
            queuedMessage,
            queueSnapshot,
            agentUiMetadata,
            uiPresentation,
        );
        return externalUiHandle;
    }

    if (options.noUi || !process.stdout.isTTY) {
        return undefined;
    }

    const uiHandle = renderCoderRunUi(moment(), { buildFrameLines: buildAgentRunUiFrame });
    seedAgentRunUiHandle(
        uiHandle,
        options,
        runner,
        actualRunnerModel,
        queuedMessage,
        queueSnapshot,
        agentUiMetadata,
        uiPresentation,
    );

    return uiHandle;
}

/**
 * Seeds one agent-run UI handle with the queue snapshot and current message metadata.
 */
function seedAgentRunUiHandle(
    uiHandle: CoderRunUiHandle,
    options: AgentRunOptions,
    runner: PromptRunner,
    actualRunnerModel: string | undefined,
    queuedMessage: AgentMessageFile,
    queueSnapshot: AgentMessageQueueSnapshot,
    agentUiMetadata: Awaited<ReturnType<typeof loadAgentRunUiMetadata>>,
    uiPresentation: AgentTickUiPresentation | undefined,
): void {
    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName: uiPresentation?.sessionAgentName || agentUiMetadata.localAgentName,
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });
    uiHandle.state.updateProgress(uiPresentation?.progressStats || createAgentQueueProgressSnapshot(queueSnapshot));
    uiHandle.state.setAgentStatusLines([...(uiPresentation?.agentStatusLines || [])]);

    if (uiPresentation?.agentStatusTableRows) {
        uiHandle.state.setAgentStatusTableRows([...uiPresentation.agentStatusTableRows]);
    } else {
        uiHandle.state.setAgentStatusTableRows([
            {
                status: 'Answering',
                agentName: uiPresentation?.sessionAgentName || agentUiMetadata.localAgentName,
                url: '.',
            },
        ]);
    }

    if (uiPresentation?.messagePreviewSections) {
        uiHandle.state.setMessagePreviewSections([...uiPresentation.messagePreviewSections]);
    }

    if (uiPresentation?.isSharedDashboard) {
        return;
    }

    uiHandle.state.setCurrentPrompt(queuedMessage.relativePath);
    uiHandle.state.setMessagePreviewLines([...(uiPresentation?.messagePreviewLines || agentUiMetadata.latestUserMessageLines)]);
    uiHandle.state.setPhase('loading');
    uiHandle.state.setStatusMessage('Preparing message');
}

/**
 * Commits the answered message move unless `--no-commit` was requested.
 */
async function commitAnsweredMessageIfEnabled(options: {
    readonly options: AgentRunOptions;
    readonly queuedMessage: AgentMessageFile;
    readonly finishedMessage: FinishedAgentMessageFile;
    readonly isQueuedMessageTracked: boolean;
    readonly uiHandle?: CoderRunUiHandle;
    readonly isSharedDashboard?: boolean;
    readonly projectPath: string;
}): Promise<void> {
    const {
        options: runOptions,
        queuedMessage,
        finishedMessage,
        isQueuedMessageTracked,
        uiHandle,
        isSharedDashboard,
        projectPath,
    } = options;

    if (runOptions.noCommit) {
        if (!isSharedDashboard) {
            uiHandle?.state.setStatusMessage('Leaving changes uncommitted');
        }
        return;
    }

    if (!isSharedDashboard) {
        uiHandle?.state.setStatusMessage('Committing message');
    }
    await commitChanges(buildAgentMessageCommitMessage(queuedMessage), {
        autoPush: runOptions.autoPush,
        includePaths: buildCommitIncludePaths(queuedMessage, finishedMessage, isQueuedMessageTracked),
        projectPath,
    });
}

/**
 * Builds the focused git path list for the answered-message commit.
 */
function buildCommitIncludePaths(
    queuedMessage: AgentMessageFile,
    finishedMessage: FinishedAgentMessageFile,
    isQueuedMessageTracked: boolean,
): ReadonlyArray<string> {
    if (isQueuedMessageTracked) {
        return [queuedMessage.relativePath, finishedMessage.relativePath];
    }

    return [finishedMessage.relativePath];
}

/**
 * Normalizes line endings in files changed during the current agent round.
 */
async function normalizeLineEndingsForAgentRound(
    projectPath: string,
    options: AgentRunOptions,
    roundChangedFilesSnapshot?: ChangedFilesSnapshot,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundChangedFilesSnapshot) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath,
            snapshot: roundChangedFilesSnapshot,
        });

        if (result.normalizedFiles > 0) {
            console.info(colors.gray(`Normalized line endings to LF in ${result.normalizedFiles} changed file(s).`));
        }
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(colors.yellow(`Automatic line-ending normalization failed: ${details}`));
    }
}

/**
 * Prints the idle queue message unless the watch loop requested silence.
 */
function announceNoQueuedMessages(options: TickAgentMessagesOptions): void {
    if (options.isQuietWhenIdle) {
        return;
    }

    console.info(colors.gray('No queued agent messages.'));
}
