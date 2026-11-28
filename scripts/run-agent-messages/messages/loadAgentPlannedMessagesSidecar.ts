import { readFile } from 'fs/promises';
import { join } from 'path';
import {
    createAgentPlannedMessagesSidecarPath,
    parseAgentPlannedMessagesSidecar,
} from '../../../src/book-3.0/AgentPlannedMessagesSidecar';
import type { AgentMessageFile } from './AgentMessageFile';
import type { AgentPlannedMessagesPromptSidecar } from './buildAgentGoalChatPromptSection';

/**
 * Loads the planned-message sidecar the Agents Server prepared for one queued message.
 *
 * @param projectPath - Absolute path of the current agent runner folder.
 * @param queuedMessage - Queued message currently being answered.
 * @returns Sidecar details for the prompt, or `null` outside Agents Server-managed runs.
 */
export async function loadAgentPlannedMessagesSidecar(
    projectPath: string,
    queuedMessage: AgentMessageFile,
): Promise<AgentPlannedMessagesPromptSidecar | null> {
    const relativeSidecarPath = createAgentPlannedMessagesSidecarPath(queuedMessage.fileName);
    const sidecarContent = await readOptionalTextFile(join(projectPath, relativeSidecarPath));

    if (sidecarContent === null) {
        return null;
    }

    const sidecar = parseAgentPlannedMessagesSidecar(sidecarContent);

    if (!sidecar) {
        return null;
    }

    return {
        relativeSidecarPath: toPortablePath(relativeSidecarPath),
        currentPlannedMessages: sidecar.currentPlannedMessages,
    };
}

/**
 * Reads one text file and treats a missing planned-message sidecar as absent.
 *
 * @param path - Absolute sidecar path.
 * @returns File content, or `null` when the sidecar does not exist.
 */
async function readOptionalTextFile(path: string): Promise<string | null> {
    try {
        return await readFile(path, 'utf-8');
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Converts a filesystem-relative path to the portable form used in prompts.
 *
 * @param path - Relative path inside the agent folder.
 * @returns Path with forward slashes.
 */
function toPortablePath(path: string): string {
    return path.replace(/\\/gu, '/');
}

/**
 * Returns true when one filesystem error indicates a missing path.
 *
 * @param error - Caught filesystem failure.
 * @returns `true` for missing-path errors.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
