import { join } from 'path';
import { AGENT_FINISHED_MESSAGES_DIRECTORY_PATH, AGENT_MESSAGES_DIRECTORY_PATH } from './agentFolderPaths';
import { createAgentMessageSidecarBaseName } from './createAgentMessageSidecarBaseName';

// Note: [💞] This file defines the shared TEAM workspace convention rather than one standalone entity.

/**
 * Relative directory for an active TEAM conversation workspace.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_TEAM_CONVERSATIONS_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'team');

/**
 * Relative directory where completed TEAM conversation transcripts are retained.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_FINISHED_TEAM_CONVERSATIONS_DIRECTORY_PATH = join(AGENT_FINISHED_MESSAGES_DIRECTORY_PATH, 'team');

/**
 * Name of the JSON manifest that describes one TEAM conversation workspace.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME = 'team.json';

/**
 * Name of the read-only teammate-source directory inside one TEAM workspace.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export const AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME = 'teammates';

/**
 * One primary agent represented in a TEAM workspace manifest.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentTeamConversationPrimaryAgent = {
    readonly permanentId: string;
    readonly agentName: string;
};

/**
 * One local teammate made available to the coding harness for a single user turn.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentTeamConversationTeammate = {
    readonly permanentId: string;
    readonly agentName: string;
    readonly url: string;
    readonly instructions: string;
    readonly sourceFileName: string;
};

/**
 * Persisted roster snapshot for the optional TEAM workspace of one queued message.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentTeamConversationWorkspaceManifest = {
    readonly version: 1;
    readonly primaryAgent: AgentTeamConversationPrimaryAgent;
    readonly teammates: ReadonlyArray<AgentTeamConversationTeammate>;
};

/**
 * Creates the stable directory name that belongs to one queued `.book` message.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentTeamConversationWorkspaceDirectoryName(messageFileName: string): string {
    return createAgentMessageSidecarBaseName(messageFileName);
}

/**
 * Creates the relative active workspace path for one queued message.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentTeamConversationWorkspacePath(messageFileName: string): string {
    return join(
        AGENT_TEAM_CONVERSATIONS_DIRECTORY_PATH,
        createAgentTeamConversationWorkspaceDirectoryName(messageFileName),
    );
}

/**
 * Creates the relative completed-workspace path for one queued message.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createFinishedAgentTeamConversationWorkspacePath(messageFileName: string): string {
    return join(
        AGENT_FINISHED_TEAM_CONVERSATIONS_DIRECTORY_PATH,
        createAgentTeamConversationWorkspaceDirectoryName(messageFileName),
    );
}

/**
 * Creates the source-snapshot file name for one teammate.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentTeamTeammateSourceFileName(teammatePermanentId: string): string {
    const normalizedPermanentId = teammatePermanentId
        .trim()
        .replace(/[^A-Za-z0-9._-]+/gu, '-')
        .replace(/^[._-]+|[._-]+$/gu, '');

    return `${normalizedPermanentId || 'teammate'}.book`;
}

/**
 * Checks whether unknown JSON has the minimum shape required for a TEAM workspace manifest.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function isAgentTeamConversationWorkspaceManifest(
    value: unknown,
): value is AgentTeamConversationWorkspaceManifest {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const manifest = value as Partial<AgentTeamConversationWorkspaceManifest>;
    if (
        manifest.version !== 1 ||
        !isPrimaryAgent(manifest.primaryAgent) ||
        !Array.isArray(manifest.teammates) ||
        !manifest.teammates.every(isTeammate)
    ) {
        return false;
    }

    return true;
}

/**
 * Checks the primary-agent part of an untrusted manifest.
 *
 * @private internal utility of `isAgentTeamConversationWorkspaceManifest`
 */
function isPrimaryAgent(value: unknown): value is AgentTeamConversationPrimaryAgent {
    return Boolean(
        value &&
            typeof value === 'object' &&
            typeof (value as AgentTeamConversationPrimaryAgent).permanentId === 'string' &&
            typeof (value as AgentTeamConversationPrimaryAgent).agentName === 'string',
    );
}

/**
 * Checks one teammate part of an untrusted manifest.
 *
 * @private internal utility of `isAgentTeamConversationWorkspaceManifest`
 */
function isTeammate(value: unknown): value is AgentTeamConversationTeammate {
    return Boolean(
        value &&
            typeof value === 'object' &&
            typeof (value as AgentTeamConversationTeammate).permanentId === 'string' &&
            typeof (value as AgentTeamConversationTeammate).agentName === 'string' &&
            typeof (value as AgentTeamConversationTeammate).url === 'string' &&
            typeof (value as AgentTeamConversationTeammate).instructions === 'string' &&
            typeof (value as AgentTeamConversationTeammate).sourceFileName === 'string',
    );
}
