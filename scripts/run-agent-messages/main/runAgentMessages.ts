import colors from 'colors';
import { just } from '../../../src/utils/organization/just';
import type { AgentRunOptions } from '../AgentRunOptions';
import { getQueuedAgentMessagesDirectoryLabel, loadAgentMessageQueueSnapshot } from './loadAgentMessageQueueSnapshot';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { shouldRunPeriodicTask } from './shouldRunPeriodicTask';
import { tickAgentMessages } from './tickAgentMessages';
import {
    initializeAgentRunUi,
    updateAgentRunUiForPulling,
    updateAgentRunUiForWatching,
} from '../ui/initializeAgentRunUi';
import { validateAgentRunOptions } from './validateAgentRunOptions';
import { validateAgentWatchOptions } from './validateAgentWatchOptions';

/**
 * Delay between idle queue checks in watch mode.
 */
const AGENT_QUEUE_POLL_INTERVAL_MS = 2_000;

/**
 * Delay between idle auto-pull runs while the queue stays empty.
 */
const AGENT_IDLE_AUTO_PULL_INTERVAL_MS = 30_000;

/**
 * Watches the queued message directory and answers messages one by one.
 */
export async function runAgentMessages(
    options: AgentRunOptions,
    controls: {
        readonly shouldContinue?: () => boolean;
    } = {},
): Promise<void> {
    validateAgentRunOptions(options);
    validateAgentWatchOptions('ptbk agent run-agent', options);
    const projectPath = process.cwd();
    const initialQueueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);
    const uiHandle = await initializeAgentRunUi(projectPath, options, initialQueueSnapshot);
    let autoPullTimestamp = options.autoPull ? Date.now() : undefined;
    const shouldContinue = controls.shouldContinue || (() => just(true));

    if (!uiHandle) {
        console.info(colors.green(`Watching ${getQueuedAgentMessagesDirectoryLabel()} for queued agent messages.`));
    }

    while (shouldContinue()) {
        const result = await tickAgentMessages(options, { isQuietWhenIdle: true, uiHandle });
        autoPullTimestamp = result.autoPullTimestamp ?? autoPullTimestamp;

        if (result.isMessageProcessed) {
            continue;
        }

        autoPullTimestamp = await waitForQueuedAgentMessage({
            projectPath,
            options,
            autoPullTimestamp,
            uiHandle,
            shouldContinue,
        });
    }
}

/**
 * Polls until at least one queued `.book` message is available.
 */
async function waitForQueuedAgentMessage(options: {
    readonly projectPath: string;
    readonly options: AgentRunOptions;
    readonly autoPullTimestamp: number | undefined;
    readonly uiHandle?: Awaited<ReturnType<typeof initializeAgentRunUi>>;
    readonly shouldContinue: () => boolean;
}): Promise<number | undefined> {
    const { projectPath, options: runOptions, uiHandle, shouldContinue } = options;
    let { autoPullTimestamp } = options;
    let queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);

    if (uiHandle) {
        updateAgentRunUiForWatching(uiHandle, queueSnapshot);
    }

    while (shouldContinue()) {
        await wait(AGENT_QUEUE_POLL_INTERVAL_MS);

        queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);

        if (queueSnapshot.queuedMessages.length > 0) {
            return autoPullTimestamp;
        }

        if (!shouldAutoPullWhileIdle(runOptions, autoPullTimestamp)) {
            continue;
        }

        if (uiHandle) {
            updateAgentRunUiForPulling(uiHandle, queueSnapshot, 'Pulling latest changes while idle');
        }

        autoPullTimestamp = await pullLatestChangesForAgentQueueIfEnabled({
            projectPath,
            runOptions,
            logMessage: uiHandle ? undefined : 'Pulling latest changes while idle...',
        });

        queueSnapshot = await loadAgentMessageQueueSnapshot(projectPath);

        if (uiHandle) {
            updateAgentRunUiForWatching(uiHandle, queueSnapshot, 'Watching queued agent messages');
        }

        if (queueSnapshot.queuedMessages.length > 0) {
            return autoPullTimestamp;
        }
    }

    // This line is unreachable but satisfies the compiler's control flow analysis
    return autoPullTimestamp;
}

/**
 * Decides whether the empty queue has been idle long enough for another auto-pull.
 */
function shouldAutoPullWhileIdle(options: AgentRunOptions, autoPullTimestamp: number | undefined): boolean {
    if (!options.autoPull) {
        return false;
    }

    return shouldRunPeriodicTask({
        lastRunTimestamp: autoPullTimestamp,
        intervalMs: AGENT_IDLE_AUTO_PULL_INTERVAL_MS,
    });
}

/**
 * Waits for the given number of milliseconds.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
