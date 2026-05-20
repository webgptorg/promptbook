import colors from 'colors';
import { pullLatestChanges } from '../../run-codex-prompts/git/pullLatestChanges';
import type { AgentRunOptions } from '../AgentRunOptions';
import { ensureWorkingTreeCleanForAgentQueue } from '../git/ensureWorkingTreeCleanForAgentQueue';

/**
 * Pulls the latest Git changes for the agent queue when `--auto-pull` is enabled.
 */
export async function pullLatestChangesForAgentQueueIfEnabled(options: {
    readonly projectPath: string;
    readonly runOptions: AgentRunOptions;
    readonly logMessage?: string;
}): Promise<number | undefined> {
    const { projectPath, runOptions, logMessage } = options;

    if (!runOptions.autoPull) {
        return undefined;
    }

    await ensureCleanQueueIfNeeded(projectPath, runOptions);
    if (logMessage) {
        console.info(colors.gray(logMessage));
    }
    await pullLatestChanges(projectPath);

    return Date.now();
}

/**
 * Runs the clean working tree guard unless the user explicitly disabled it.
 */
async function ensureCleanQueueIfNeeded(projectPath: string, options: AgentRunOptions): Promise<void> {
    if (options.ignoreGitChanges) {
        return;
    }

    await ensureWorkingTreeCleanForAgentQueue(projectPath);
}
