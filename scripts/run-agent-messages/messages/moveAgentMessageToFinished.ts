import { mkdir, rename, stat } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { AGENT_FINISHED_MESSAGES_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import { ConflictError } from '../../../src/errors/ConflictError';
import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Result of moving one answered message into the finished queue.
 */
export type FinishedAgentMessageFile = {
    readonly absolutePath: string;
    readonly relativePath: string;
    readonly fileName: string;
};

/**
 * Moves one answered queued message to `messages/finished`.
 */
export async function moveAgentMessageToFinished(
    projectPath: string,
    messageFile: AgentMessageFile,
): Promise<FinishedAgentMessageFile> {
    const finishedDirectoryPath = join(projectPath, AGENT_FINISHED_MESSAGES_DIRECTORY_PATH);
    const finishedMessagePath = join(finishedDirectoryPath, messageFile.fileName);
    const finishedMessageRelativePath = normalizeRelativePath(
        join(AGENT_FINISHED_MESSAGES_DIRECTORY_PATH, messageFile.fileName),
    );

    if (await isExistingPath(finishedMessagePath)) {
        throw new ConflictError(
            spaceTrim(`
                Cannot move answered message to \`${finishedMessageRelativePath}\` because the file already exists.

                Rename or remove the existing finished message, then run \`ptbk agent tick\` again.
            `),
        );
    }

    await mkdir(finishedDirectoryPath, { recursive: true });
    await rename(messageFile.absolutePath, finishedMessagePath);

    return {
        absolutePath: finishedMessagePath,
        relativePath: finishedMessageRelativePath,
        fileName: messageFile.fileName,
    };
}

/**
 * Checks whether a filesystem path already exists.
 */
async function isExistingPath(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * Normalizes a relative path for Git and display.
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
