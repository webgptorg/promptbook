import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { just } from '../../../src/utils/organization/just';
import type { AgentRunOptions } from '../AgentRunOptions';
import { listQueuedAgentMessages } from '../messages/listQueuedAgentMessages';
import { tickAgentMessages } from './tickAgentMessages';
import { validateAgentRunOptions } from './validateAgentRunOptions';

/**
 * Delay between idle queue checks in watch mode.
 */
const AGENT_QUEUE_POLL_INTERVAL_MS = 2_000;

/**
 * Watches the queued message directory and answers messages one by one.
 */
export async function runAgentMessages(options: AgentRunOptions): Promise<void> {
    validateAgentRunOptions(options);
    validateAgentWatchOptions(options);

    console.info(
        colors.green(
            `Watching ${AGENT_QUEUED_MESSAGES_DIRECTORY_PATH.replace(/\\/gu, '/')} for queued agent messages.`,
        ),
    );

    while (just(true)) {
        const result = await tickAgentMessages(options, { isQuietWhenIdle: true });

        if (result.isMessageProcessed) {
            continue;
        }

        await waitForQueuedAgentMessage(process.cwd());
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
 * Polls until at least one queued markdown message is available.
 */
async function waitForQueuedAgentMessage(projectPath: string): Promise<void> {
    while (just(true)) {
        await wait(AGENT_QUEUE_POLL_INTERVAL_MS);

        if ((await listQueuedAgentMessages(projectPath)).length > 0) {
            return;
        }
    }
}

/**
 * Waits for the given number of milliseconds.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
