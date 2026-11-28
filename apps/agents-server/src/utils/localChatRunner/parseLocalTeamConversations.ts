import type { ToolCall } from '@promptbook-local/types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Book } from '../../../../../src/book-3.0/Book';
import {
    AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME,
    createFinishedAgentTeamConversationWorkspacePath,
    isAgentTeamConversationWorkspaceManifest,
    type AgentTeamConversationTeammate,
    type AgentTeamConversationWorkspaceManifest,
} from '../../../../../src/book-3.0/AgentTeamConversationWorkspace';
import { createTeamToolName } from '../../../../../src/book-2.0/agent-source/createTeamToolName';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

/**
 * One normalized message parsed from a coding-harness TEAM transcript.
 */
export type LocalTeamConversationMessage = {
    readonly sender: 'AGENT' | 'TEAMMATE';
    readonly name: string;
    readonly content: string;
};

/**
 * One valid harness-created teammate conversation ready for persistence and chip rendering.
 */
export type ParsedLocalTeamConversation = {
    readonly transcriptFileName: string;
    readonly teammate: AgentTeamConversationTeammate;
    readonly conversation: ReadonlyArray<LocalTeamConversationMessage>;
    readonly toolCall: ToolCall;
};

/**
 * Reads every valid teammate transcript that the coding harness left beside a finished message.
 */
export async function parseFinishedLocalTeamConversations(options: {
    readonly agentDirectoryPath: string;
    readonly metadata: LocalUserChatJobMetadata;
    readonly job: Pick<UserChatJobRecord, 'id' | 'queuedAt'>;
}): Promise<Array<ParsedLocalTeamConversation>> {
    const workspacePath = join(
        options.agentDirectoryPath,
        createFinishedAgentTeamConversationWorkspacePath(options.metadata.fileName),
    );
    const manifestContent = await readOptionalTextFile(join(workspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME));
    const manifest = manifestContent ? parseTeamConversationManifest(manifestContent) : null;

    if (!manifest) {
        return [];
    }

    const transcriptFileNames = await listTranscriptFileNames(workspacePath);
    const conversations: Array<ParsedLocalTeamConversation> = [];

    for (const transcriptFileName of transcriptFileNames) {
        const transcriptContent = await readOptionalTextFile(join(workspacePath, transcriptFileName));
        if (!transcriptContent) {
            continue;
        }

        const conversation = parseLocalTeamConversationBook({
            transcriptFileName,
            transcriptContent,
            manifest,
            job: options.job,
        });

        if (conversation) {
            conversations.push(conversation);
        }
    }

    return conversations;
}

/**
 * Parses one TEAM transcript and translates it to the ordinary TEAM tool-call shape used by chat chips.
 */
export function parseLocalTeamConversationBook(options: {
    readonly transcriptFileName: string;
    readonly transcriptContent: string;
    readonly manifest: AgentTeamConversationWorkspaceManifest;
    readonly job: Pick<UserChatJobRecord, 'id' | 'queuedAt'>;
}): ParsedLocalTeamConversation | null {
    const teammate = resolveTranscriptTeammate(options.transcriptFileName, options.manifest.teammates);
    if (!teammate) {
        return null;
    }

    const conversation = parseTranscriptMessages(
        options.transcriptContent,
        options.manifest.primaryAgent.agentName,
        teammate.agentName,
    );
    if (!conversation) {
        return null;
    }

    const request = conversation[0]!.content;
    const response = conversation[conversation.length - 1]!.content;
    const toolName = createTeamToolName(teammate.url, teammate.agentName);

    return {
        transcriptFileName: options.transcriptFileName,
        teammate,
        conversation,
        toolCall: {
            name: toolName,
            arguments: { message: request },
            result: {
                teammate: {
                    url: teammate.url,
                    label: teammate.agentName,
                    instructions: teammate.instructions || undefined,
                    toolName,
                },
                request,
                response,
                conversation,
            },
            state: 'COMPLETE',
            idempotencyKey: `local-team:${options.job.id}:${options.transcriptFileName}`,
            createdAt: options.job.queuedAt as NonNullable<ToolCall['createdAt']>,
        },
    };
}

/**
 * Finds the teammate addressed by a transcript file name.
 */
function resolveTranscriptTeammate(
    transcriptFileName: string,
    teammates: ReadonlyArray<AgentTeamConversationTeammate>,
): AgentTeamConversationTeammate | null {
    return (
        teammates.find(
            (teammate) =>
                transcriptFileName === `${teammate.permanentId}.book` ||
                transcriptFileName.startsWith(`${teammate.permanentId}--`),
        ) || null
    );
}

/**
 * Parses and validates alternating primary-agent and teammate messages from one transcript.
 */
function parseTranscriptMessages(
    transcriptContent: string,
    primaryAgentName: string,
    teammateName: string,
): Array<LocalTeamConversationMessage> | null {
    let messages: ReturnType<Book['getMessages']>;

    try {
        messages = Book.parse(transcriptContent as string_book).getMessages();
    } catch {
        // Note: The coding harness owns this sidecar. A malformed optional transcript must not block
        //       the already completed primary chat from being synchronized.
        return null;
    }

    const conversation: Array<LocalTeamConversationMessage> = [];

    for (const message of messages) {
        const content = message.content.trim();
        const sender = resolveTranscriptSender(String(message.sender), primaryAgentName, teammateName);

        if (!content || !sender) {
            return null;
        }

        if (conversation.at(-1)?.sender === sender) {
            return null;
        }

        conversation.push({
            sender,
            name: sender === 'AGENT' ? primaryAgentName : teammateName,
            content,
        });
    }

    if (
        conversation.length < 2 ||
        conversation[0]?.sender !== 'AGENT' ||
        conversation[conversation.length - 1]?.sender !== 'TEAMMATE'
    ) {
        return null;
    }

    return conversation;
}

/**
 * Maps one Book participant marker to the transcript role it represents.
 */
function resolveTranscriptSender(
    sender: string,
    primaryAgentName: string,
    teammateName: string,
): LocalTeamConversationMessage['sender'] | null {
    const normalizedSender = normalizeParticipantName(sender);

    if (normalizedSender === 'AGENT' || normalizedSender === normalizeParticipantName(primaryAgentName)) {
        return 'AGENT';
    }

    if (normalizedSender === 'TEAMMATE' || normalizedSender === normalizeParticipantName(teammateName)) {
        return 'TEAMMATE';
    }

    return null;
}

/**
 * Normalizes a participant name for case-insensitive Book transcript matching.
 */
function normalizeParticipantName(name: string): string {
    return name.trim().toLocaleUpperCase();
}

/**
 * Parses an untrusted TEAM workspace manifest.
 */
function parseTeamConversationManifest(manifestContent: string): AgentTeamConversationWorkspaceManifest | null {
    try {
        const manifest: unknown = JSON.parse(manifestContent);
        return isAgentTeamConversationWorkspaceManifest(manifest) ? manifest : null;
    } catch {
        return null;
    }
}

/**
 * Lists direct `.book` transcript files from a finished TEAM workspace.
 */
async function listTranscriptFileNames(workspacePath: string): Promise<Array<string>> {
    try {
        const entries = await readdir(workspacePath, { withFileTypes: true });
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
 * Reads one text file and treats a missing finished sidecar as absent.
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
