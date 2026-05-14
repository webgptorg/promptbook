import moment from 'moment';
import colors from 'colors';
import {
    captureChangedFilesSnapshot,
    normalizeLineEndingsInFilesChangedSinceSnapshot,
    type ChangedFilesSnapshot,
} from '../../run-codex-prompts/common/normalizeLineEndingsInChangedFiles';
import { withPromptRuntimeLog } from '../../run-codex-prompts/common/runGoScript/withPromptRuntimeLog';
import { printAgentGitIdentityTipAtProcessExitIfNeeded } from '../../run-codex-prompts/git/agentGitIdentity';
import { commitChanges } from '../../run-codex-prompts/git/commitChanges';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';
import type { PromptRunner } from '../../run-codex-prompts/runners/types/PromptRunner';
import { runPromptWithTestFeedback } from '../../run-codex-prompts/testing/runPromptWithTestFeedback';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
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
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { validateAgentRunOptions } from './validateAgentRunOptions';

/**
 * Result of one `ptbk agent tick` invocation.
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
    readonly uiHandle?: CoderRunUiHandle;
};

/**
 * Answers one queued `.book` message thread and moves it to `messages/finished`.
 */
export async function tickAgentMessages(
    options: AgentRunOptions,
    tickOptions: TickAgentMessagesOptions = {},
): Promise<AgentTickResult> {
    validateAgentRunOptions(options);

    const projectPath = process.cwd();
    let queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);
    let queuedMessage = queueSnapshot.queuedMessages[0];

    if (!queuedMessage) {
        announceNoQueuedMessages(tickOptions);
        return { isMessageProcessed: false };
    }

    if (tickOptions.uiHandle) {
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
            if (tickOptions.uiHandle) {
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
        tickOptions.uiHandle,
    );

    try {
        const finishedMessage = await runQueuedAgentMessage({
            projectPath,
            options,
            runner,
            queuedMessage,
            uiHandle,
        });

        uiHandle?.state.updateProgress(
            createAgentQueueProgressSnapshot({
                finishedMessageCount: queueSnapshot.finishedMessageCount + 1,
                queuedMessages: queueSnapshot.queuedMessages.slice(1),
            }),
        );
        uiHandle?.state.setStatusMessage('Message answered');
        uiHandle?.state.setPhase('done');

        return {
            isMessageProcessed: true,
            autoPullTimestamp,
            queuedMessage,
            finishedMessage,
        };
    } catch (error) {
        uiHandle?.state.setPhase('error');
        uiHandle?.state.addError(error instanceof Error ? error.message : String(error));
        throw error;
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
}): Promise<FinishedAgentMessageFile> {
    const { projectPath, options: runOptions, runner, queuedMessage, uiHandle } = options;
    const prompt = buildAgentMessagePrompt(queuedMessage.relativePath);
    const scriptPath = buildAgentMessageScriptPath(projectPath, queuedMessage);
    const roundChangedFilesSnapshot = runOptions.normalizeLineEndings
        ? await captureChangedFilesSnapshot(projectPath)
        : undefined;
    const isQueuedMessageTracked = await isGitPathTracked(projectPath, queuedMessage.relativePath);

    if (!uiHandle) {
        console.info(colors.blue(`Processing ${queuedMessage.relativePath}`));
    }

    uiHandle?.state.setPhase('running');
    uiHandle?.state.setStatusMessage('Running');
    uiHandle?.startCapturingAgentOutput();

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
    } finally {
        uiHandle?.stopCapturingAgentOutput();
    }

    await normalizeLineEndingsForAgentRound(runOptions, roundChangedFilesSnapshot);

    const finishedMessage = await moveAgentMessageToFinished(projectPath, queuedMessage);
    await commitAnsweredMessageIfEnabled({
        options: runOptions,
        queuedMessage,
        finishedMessage,
        isQueuedMessageTracked,
        uiHandle,
    });

    return finishedMessage;
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
): void {
    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName: agentUiMetadata.localAgentName,
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });
    uiHandle.state.updateProgress(createAgentQueueProgressSnapshot(queueSnapshot));
    uiHandle.state.setCurrentPrompt(queuedMessage.relativePath);
    uiHandle.state.setMessagePreviewLines([...agentUiMetadata.latestUserMessageLines]);
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
}): Promise<void> {
    const { options: runOptions, queuedMessage, finishedMessage, isQueuedMessageTracked, uiHandle } = options;

    if (runOptions.noCommit) {
        uiHandle?.state.setStatusMessage('Leaving changes uncommitted');
        return;
    }

    uiHandle?.state.setStatusMessage('Committing message');
    await commitChanges(buildAgentMessageCommitMessage(queuedMessage), {
        autoPush: runOptions.autoPush,
        includePaths: buildCommitIncludePaths(queuedMessage, finishedMessage, isQueuedMessageTracked),
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
    options: AgentRunOptions,
    roundChangedFilesSnapshot?: ChangedFilesSnapshot,
): Promise<void> {
    if (!options.normalizeLineEndings || !roundChangedFilesSnapshot) {
        return;
    }

    try {
        const result = await normalizeLineEndingsInFilesChangedSinceSnapshot({
            projectPath: process.cwd(),
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
