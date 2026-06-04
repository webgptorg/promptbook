import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { AGENT_FAILED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent-folder/agentProjectPaths';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Result of moving one abandoned queued message into the failed queue.
 */
export type FailedAgentMessageFile = {
    readonly absolutePath: string;
    readonly relativePath: string;
    readonly fileName: string;
};

/**
 * Moves one repeatedly failing queued message to `messages/failed` with a visible agent failure reply.
 */
export async function moveAgentMessageToFailed(options: {
    readonly projectPath: string;
    readonly messageFile: AgentMessageFile;
    readonly failureReason: string;
}): Promise<FailedAgentMessageFile> {
    const { projectPath, messageFile, failureReason } = options;
    const failedDirectoryPath = join(projectPath, AGENT_FAILED_MESSAGES_DIRECTORY_PATH);
    const failedMessagePath = join(failedDirectoryPath, messageFile.fileName);
    const failedMessageRelativePath = normalizeRelativePath(
        join(AGENT_FAILED_MESSAGES_DIRECTORY_PATH, messageFile.fileName),
    );
    const queuedMessageContent = await readFile(messageFile.absolutePath, 'utf-8');

    await mkdir(failedDirectoryPath, { recursive: true });
    await rm(failedMessagePath, { force: true });
    await rename(messageFile.absolutePath, failedMessagePath);
    await writeFile(failedMessagePath, appendFailureReply(queuedMessageContent, failureReason), 'utf-8');

    return {
        absolutePath: failedMessagePath,
        relativePath: failedMessageRelativePath,
        fileName: messageFile.fileName,
    };
}

/**
 * Appends a synthetic `@Agent` reply so the Agents Server can display the terminal failure reason.
 */
function appendFailureReply(bookContent: string, failureReason: string): string {
    const normalizedBookContent = bookContent.trimEnd();
    const normalizedFailureReason = failureReason.trim();

    return `${normalizedBookContent}\n\nMESSAGE @Agent\n${normalizedFailureReason}\n`;
}

/**
 * Normalizes a relative path for Git and display.
 */
function normalizeRelativePath(relativePath: string): string {
    return relativePath.replace(/\\/gu, '/');
}
