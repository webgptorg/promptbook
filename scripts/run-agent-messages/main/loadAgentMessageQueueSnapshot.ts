import { readdir } from 'fs/promises';
import { join } from 'path';
import {
    AGENT_FINISHED_MESSAGES_DIRECTORY_PATH,
    AGENT_QUEUED_MESSAGES_DIRECTORY_PATH,
} from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import type { AgentMessageFile } from '../messages/AgentMessageFile';
import { listQueuedAgentMessages } from '../messages/listQueuedAgentMessages';

/**
 * Queue counts and files used to render the agent-run dashboard.
 */
export type AgentMessageQueueSnapshot = {
    readonly queuedMessages: ReadonlyArray<AgentMessageFile>;
    readonly finishedMessageCount: number;
};

/**
 * Reads current queued and finished message counts for the agent dashboard.
 */
export async function loadAgentMessageQueueSnapshot(projectPath: string): Promise<AgentMessageQueueSnapshot> {
    const [queuedMessages, finishedMessageCount] = await Promise.all([
        listQueuedAgentMessages(projectPath),
        countBookFiles(join(projectPath, AGENT_FINISHED_MESSAGES_DIRECTORY_PATH)),
    ]);

    return {
        queuedMessages,
        finishedMessageCount,
    };
}

/**
 * Converts agent queue counts into the prompt-style snapshot used by the shared rich UI state.
 */
export function createAgentQueueProgressSnapshot(queueSnapshot: AgentMessageQueueSnapshot) {
    return {
        done: queueSnapshot.finishedMessageCount,
        forAgent: queueSnapshot.queuedMessages.length,
        belowMinimumPriority: 0,
        toBeWritten: 0,
    };
}

/**
 * Returns the normalized queued-messages path shown in the UI.
 */
export function getQueuedAgentMessagesDirectoryLabel(): string {
    return AGENT_QUEUED_MESSAGES_DIRECTORY_PATH.replace(/\\/gu, '/');
}

/**
 * Counts `.book` files inside one queue directory and treats a missing directory as empty.
 */
async function countBookFiles(directoryPath: string): Promise<number> {
    try {
        const directoryEntries = await readdir(directoryPath, { withFileTypes: true });
        return directoryEntries.filter((directoryEntry) => directoryEntry.isFile() && /\.book$/iu.test(directoryEntry.name)).length;
    } catch (error) {
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR')
        ) {
            return 0;
        }

        throw error;
    }
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names
