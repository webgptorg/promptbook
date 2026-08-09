import { readFile } from 'fs/promises';
import { join } from 'path';
import {
    AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME,
    createAgentTeamConversationWorkspacePath,
    isAgentTeamConversationWorkspaceManifest,
} from '../../../src/book-3.0/AgentTeamConversationWorkspace';
import type { AgentMessageFile } from './AgentMessageFile';
import type { AgentTeamPromptWorkspace } from './buildAgentTeamPromptSection';

/**
 * Loads the optional TEAM roster snapshot for one queued message.
 */
export async function loadAgentTeamConversationWorkspace(
    projectPath: string,
    queuedMessage: AgentMessageFile,
): Promise<AgentTeamPromptWorkspace | null> {
    const relativeWorkspacePath = createAgentTeamConversationWorkspacePath(queuedMessage.fileName);
    const manifestPath = join(projectPath, relativeWorkspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME);
    const manifestContent = await readOptionalTextFile(manifestPath);

    if (manifestContent === null) {
        return null;
    }

    const manifest = parseAgentTeamConversationWorkspaceManifest(manifestContent);
    if (!manifest || manifest.teammates.length === 0) {
        return null;
    }

    return {
        relativeWorkspacePath: toPortablePath(relativeWorkspacePath),
        manifest,
    };
}

/**
 * Parses one untrusted TEAM workspace manifest without making a queued message fail for stale sidecar data.
 */
function parseAgentTeamConversationWorkspaceManifest(
    manifestContent: string,
): AgentTeamPromptWorkspace['manifest'] | null {
    try {
        const parsedManifest: unknown = JSON.parse(manifestContent);
        return isAgentTeamConversationWorkspaceManifest(parsedManifest) ? parsedManifest : null;
    } catch {
        return null;
    }
}

/**
 * Reads one text file and treats a missing team workspace as absent.
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
 * Converts a filesystem-relative path to the portable form used by prompts and Git.
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
