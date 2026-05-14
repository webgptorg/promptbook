import moment from 'moment';
import type { AgentRunOptions } from '../AgentRunOptions';
import { createCoderRunOptionsForAgent } from '../main/createCoderRunOptionsForAgent';
import {
    createAgentQueueProgressSnapshot,
    getQueuedAgentMessagesDirectoryLabel,
    type AgentMessageQueueSnapshot,
} from '../main/loadAgentMessageQueueSnapshot';
import { resolvePromptRunner } from '../../run-codex-prompts/main/resolvePromptRunner';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../run-codex-prompts/ui/renderCoderRunUi';
import { buildAgentRunUiFrame } from './buildAgentRunUiFrame';
import { readLocalAgentName } from './loadAgentRunUiMetadata';

/**
 * Creates and seeds the persistent rich terminal UI used by `ptbk agent run`.
 */
export async function initializeAgentRunUi(
    projectPath: string,
    options: AgentRunOptions,
    queueSnapshot: AgentMessageQueueSnapshot,
): Promise<CoderRunUiHandle | undefined> {
    if (options.noUi || !process.stdout.isTTY) {
        return undefined;
    }

    const sharedRunOptions = createCoderRunOptionsForAgent(options);
    const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);
    const localAgentName = await readLocalAgentName(projectPath);
    const uiHandle = renderCoderRunUi(moment(), { buildFrameLines: buildAgentRunUiFrame });

    uiHandle.state.setConfig({
        agentName: runner.name,
        localAgentName,
        modelName: actualRunnerModel,
        thinkingLevel: options.thinkingLevel,
        priority: 0,
    });

    updateAgentRunUiForWatching(uiHandle, queueSnapshot);
    return uiHandle;
}

/**
 * Updates the persistent rich UI to the idle watch state.
 */
export function updateAgentRunUiForWatching(
    uiHandle: CoderRunUiHandle,
    queueSnapshot: AgentMessageQueueSnapshot,
    statusMessage = 'Watching queued agent messages',
): void {
    uiHandle.state.updateProgress(createAgentQueueProgressSnapshot(queueSnapshot));
    uiHandle.state.setCurrentPrompt('');
    uiHandle.state.setPhase('waiting');
    uiHandle.state.setStatusMessage(statusMessage);
    uiHandle.state.setDetailLines([`Watching ${getQueuedAgentMessagesDirectoryLabel()} for queued agent messages.`]);
    uiHandle.state.setMessagePreviewLines(['Waiting for the next queued `MESSAGE @User`.']);
}

/**
 * Updates the persistent rich UI while the runner refreshes the queue repository.
 */
export function updateAgentRunUiForPulling(
    uiHandle: CoderRunUiHandle,
    queueSnapshot: AgentMessageQueueSnapshot,
    statusMessage: string,
): void {
    uiHandle.state.updateProgress(createAgentQueueProgressSnapshot(queueSnapshot));
    uiHandle.state.setCurrentPrompt('');
    uiHandle.state.setPhase('loading');
    uiHandle.state.setStatusMessage(statusMessage);
    uiHandle.state.setDetailLines([`Refreshing ${getQueuedAgentMessagesDirectoryLabel()} before checking for new work.`]);
    uiHandle.state.setMessagePreviewLines(['Waiting for the next queued `MESSAGE @User`.']);
}

