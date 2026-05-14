import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { just } from '../../../src/utils/organization/just';
import type { AgentRunOptions } from '../AgentRunOptions';
import { listQueuedAgentMessages } from '../messages/listQueuedAgentMessages';
import { pullLatestChangesForAgentQueueIfEnabled } from './pullLatestChangesForAgentQueueIfEnabled';
import { tickAgentMessages } from './tickAgentMessages';
import { validateAgentRunOptions } from './validateAgentRunOptions';

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
export async function runAgentMessages(options: AgentRunOptions): Promise<void> {
    validateAgentRunOptions(options);
    validateAgentWatchOptions(options);
    const projectPath = process.cwd();
    let autoPullTimestamp = options.autoPull ? Date.now() : undefined;

    console.info(
        colors.green(
            `Watching ${AGENT_QUEUED_MESSAGES_DIRECTORY_PATH.replace(/\\/gu, '/')} for queued agent messages.`,
        ),
    );

    while (just(true)) {
        const result = await tickAgentMessages(options, { isQuietWhenIdle: true });
        autoPullTimestamp = result.autoPullTimestamp ?? autoPullTimestamp;

        if (result.isMessageProcessed) {
            continue;
        }

        autoPullTimestamp = await waitForQueuedAgentMessage({
            projectPath,
            options,
            autoPullTimestamp,
        });
    }
}

/**
 * Validates constraints specific to the never-ending watch loop.
 */
function validateAgentWatchOptions(options: AgentRunOptions): void {
    if (!options.noCommit || options.ignoreGitChanges) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Flag \`--no-commit\` requires \`--ignore-git-changes\` when used with \`ptbk agent run\`.

            Without commits, answered messages remain in the working tree and the next message round would fail the clean working tree check.
        `),
    );
}

/**
 * Polls until at least one queued `.book` message is available.
 */
async function waitForQueuedAgentMessage(options: {
    readonly projectPath: string;
    readonly options: AgentRunOptions;
    readonly autoPullTimestamp: number | undefined;
}): Promise<number | undefined> {
    const { projectPath, options: runOptions } = options;
    let { autoPullTimestamp } = options;

    while (just(true)) {
        await wait(AGENT_QUEUE_POLL_INTERVAL_MS);

        if ((await listQueuedAgentMessages(projectPath)).length > 0) {
            return autoPullTimestamp;
        }

        if (!shouldAutoPullWhileIdle(runOptions, autoPullTimestamp)) {
            continue;
        }

        autoPullTimestamp = await pullLatestChangesForAgentQueueIfEnabled({
            projectPath,
            runOptions,
            logMessage: 'Pulling latest changes while idle...',
        });

        if ((await listQueuedAgentMessages(projectPath)).length > 0) {
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
    if (!options.autoPull || autoPullTimestamp === undefined) {
        return false;
    }

    return Date.now() - autoPullTimestamp >= AGENT_IDLE_AUTO_PULL_INTERVAL_MS;
}

/**
 * Waits for the given number of milliseconds.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
