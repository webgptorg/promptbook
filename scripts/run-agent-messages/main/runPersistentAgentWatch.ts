import { spaceTrim } from 'spacetrim';
import { just } from '../../../src/utils/organization/just';
import { handleAgentWatchError } from './handleAgentWatchError';

/**
 * Delay before restarting a long-running agent watch command after an unexpected stop.
 */
const AGENT_WATCH_RESTART_DELAY_MS = 2_000;

/**
 * Shared supervisor options for `ptbk agent-folder` watch commands that should never stop by themselves.
 */
export type RunPersistentAgentWatchOptions = {
    readonly commandDisplayName: string;
    readonly logDirectoryPath: string;
    readonly runWatch: () => Promise<void>;
};

/**
 * Test and hosting controls for the persistent watch supervisor.
 */
export type RunPersistentAgentWatchControls = {
    readonly shouldContinue?: () => boolean;
    readonly restartDelayMs?: number;
};

/**
 * Keeps a watch command alive indefinitely by restarting it after unexpected returns or thrown errors.
 */
export async function runPersistentAgentWatch(
    options: RunPersistentAgentWatchOptions,
    controls: RunPersistentAgentWatchControls = {},
): Promise<void> {
    const { commandDisplayName, logDirectoryPath, runWatch } = options;
    const shouldContinue = controls.shouldContinue || (() => just(true));
    const restartDelayMs = controls.restartDelayMs ?? AGENT_WATCH_RESTART_DELAY_MS;

    while (shouldContinue()) {
        try {
            await runWatch();

            if (!shouldContinue()) {
                return;
            }

            await handleAgentWatchError({
                commandDisplayName,
                logDirectoryPath,
                error: new Error(
                    spaceTrim(`
                        \`${commandDisplayName}\` stopped unexpectedly without a shutdown request.

                        The watcher will restart automatically and continue waiting for future queued messages.
                    `),
                ),
            });
        } catch (error) {
            await handleAgentWatchError({
                commandDisplayName,
                logDirectoryPath,
                error,
            });
        }

        if (!shouldContinue()) {
            return;
        }

        await wait(restartDelayMs);
    }
}

/**
 * Waits before the next automatic watch restart attempt.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
