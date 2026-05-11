import type { Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Lists queued markdown message files in deterministic filename order.
 */
export async function listQueuedAgentMessages(projectPath: string): Promise<ReadonlyArray<AgentMessageFile>> {
    const queuedMessagesDirectoryPath = join(projectPath, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH);
    const directoryEntries = await readQueuedMessageDirectoryEntries(queuedMessagesDirectoryPath);

    return directoryEntries
        .filter((entry) => entry.isFile() && isMarkdownFileName(entry.name))
        .map((entry) => ({
            absolutePath: join(queuedMessagesDirectoryPath, entry.name),
            relativePath: normalizeRelativePath(join(AGENT_QUEUED_MESSAGES_DIRECTORY_PATH, entry.name)),
            fileName: entry.name,
        }))
        .sort((firstMessage, secondMessage) => firstMessage.fileName.localeCompare(secondMessage.fileName));
}

/**
 * Reads queued directory entries and treats a missing queue as empty.
 */
async function readQueuedMessageDirectoryEntries(queuedMessagesDirectoryPath: string): Promise<Dirent[]> {
    try {
        return await readdir(queuedMessagesDirectoryPath, { withFileTypes: true });
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return [];
        }

        throw error;
    }
}

/**
 * Checks whether one filename is a markdown message file.
 */
function isMarkdownFileName(fileName: string): boolean {
    return /\.m(?:d|arkdown)$/iu.test(fileName);
}

/**
 * Normalizes a relative path for Markdown links and Git path matching.
 */
function normalizeRelativePath(relativePath: string): string {
    return relativePath.replace(/\\/gu, '/');
}

/**
 * Returns true when an error is a missing-path filesystem error.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
