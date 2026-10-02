import { mkdir, readdir, rename, rm, stat } from 'fs/promises';
import { join } from 'path';
import {
    AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME,
    createAgentTeamConversationWorkspacePath,
    createFinishedAgentTeamConversationWorkspacePath,
} from '../../../src/book-3.0/AgentTeamConversationWorkspace';
import type { AgentMessageFile } from './AgentMessageFile';
import type { AgentTeamPromptWorkspace } from './buildAgentTeamPromptSection';

/**
 * TEAM transcript files retained next to the finished user message.
 */
export type FinishedAgentTeamConversationWorkspace = {
    readonly relativePaths: ReadonlyArray<string>;
};

/**
 * Moves harness-created TEAM conversation transcripts into the finished-message history.
 */
export async function finalizeAgentTeamConversationWorkspace(options: {
    readonly projectPath: string;
    readonly queuedMessage: AgentMessageFile;
    readonly workspace: AgentTeamPromptWorkspace | null;
}): Promise<FinishedAgentTeamConversationWorkspace | null> {
    if (!options.workspace) {
        return null;
    }

    const activeWorkspacePath = join(
        options.projectPath,
        createAgentTeamConversationWorkspacePath(options.queuedMessage.fileName),
    );
    const activeManifestPath = join(activeWorkspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME);
    const transcriptFileNames = await listAgentTeamTranscriptFileNames(activeWorkspacePath);

    if (!(await isExistingPath(activeManifestPath))) {
        return null;
    }

    if (transcriptFileNames.length === 0) {
        await rm(activeWorkspacePath, { recursive: true, force: true });
        return null;
    }

    const finishedRelativeWorkspacePath = createFinishedAgentTeamConversationWorkspacePath(
        options.queuedMessage.fileName,
    );
    const finishedWorkspacePath = join(options.projectPath, finishedRelativeWorkspacePath);
    await rm(finishedWorkspacePath, { recursive: true, force: true });
    await mkdir(finishedWorkspacePath, { recursive: true });

    const relativePaths = [
        toPortablePath(join(finishedRelativeWorkspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME)),
    ];
    await rename(activeManifestPath, join(finishedWorkspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME));

    for (const transcriptFileName of transcriptFileNames) {
        await rename(join(activeWorkspacePath, transcriptFileName), join(finishedWorkspacePath, transcriptFileName));
        relativePaths.push(toPortablePath(join(finishedRelativeWorkspacePath, transcriptFileName)));
    }

    await rm(activeWorkspacePath, { recursive: true, force: true });

    return { relativePaths };
}

/**
 * Lists only direct transcript `.book` files and deliberately excludes read-only teammate sources.
 */
async function listAgentTeamTranscriptFileNames(activeWorkspacePath: string): Promise<Array<string>> {
    try {
        const entries = await readdir(activeWorkspacePath, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.book'))
            .map((entry) => entry.name)
            .sort((firstFileName, secondFileName) => firstFileName.localeCompare(secondFileName));
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return [];
        }

        throw error;
    }
}

/**
 * Checks whether one fixed workspace path exists.
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
 * Converts a filesystem-relative path into a portable Git path.
 */
function toPortablePath(path: string): string {
    return path.replace(/\\/gu, '/');
}

/**
 * Returns true when one filesystem error indicates a missing path.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
