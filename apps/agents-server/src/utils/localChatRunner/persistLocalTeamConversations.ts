import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { persistFrozenUserChat } from '../userChat/persistFrozenUserChat';
import { attachTeamMemberUserChatContext } from '../userChat/teamMemberUserChatContext';
import { USER_CHAT_SOURCES } from '../userChat/UserChatSource';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { ParsedLocalTeamConversation } from './parseLocalTeamConversations';

/**
 * Persists teammate transcripts as frozen chats and returns their chip-ready tool calls.
 */
export async function persistLocalTeamConversations(options: {
    readonly job: Pick<UserChatJobRecord, 'id' | 'userId' | 'agentPermanentId' | 'chatId' | 'queuedAt'>;
    readonly conversations: ReadonlyArray<ParsedLocalTeamConversation>;
}): Promise<ReadonlyArray<ToolCall>> {
    for (const conversation of options.conversations) {
        await persistFrozenUserChat({
            userId: options.job.userId,
            agentPermanentId: conversation.teammate.permanentId,
            source: USER_CHAT_SOURCES.TEAM_MEMBER,
            chatId: createLocalTeamMemberChatId(options.job.id, conversation.transcriptFileName),
            messages: createFrozenTeamConversationMessages(options.job, conversation),
        });
    }

    return options.conversations.map((conversation) => conversation.toolCall);
}

/**
 * Creates the frozen teammate-chat transcript and its primary-chat relation.
 */
function createFrozenTeamConversationMessages(
    job: Pick<UserChatJobRecord, 'id' | 'agentPermanentId' | 'chatId' | 'queuedAt'>,
    conversation: ParsedLocalTeamConversation,
): Array<ChatMessage> {
    const queuedAt = Date.parse(job.queuedAt);
    const baseTimestamp = Number.isFinite(queuedAt) ? queuedAt : Date.now();
    const transcriptIdentifier = normalizeTranscriptIdentifier(conversation.transcriptFileName);
    const messages = conversation.conversation.map((message, index) => ({
        id: `team-${job.id}-${transcriptIdentifier}-${index + 1}`,
        sender: message.sender === 'AGENT' ? 'USER' : 'AGENT',
        content: message.content,
        isComplete: true,
        createdAt: new Date(baseTimestamp + index * 1_000).toISOString() as NonNullable<ChatMessage['createdAt']>,
    }));

    return attachTeamMemberUserChatContext(messages, {
        version: 1,
        primaryAgentPermanentId: job.agentPermanentId,
        primaryAgentName: conversation.conversation[0]?.name || 'Agent',
        primaryChatId: job.chatId,
    });
}

/**
 * Creates a stable frozen-chat id so repeated synchronization refreshes the same transcript.
 */
function createLocalTeamMemberChatId(jobId: string, transcriptFileName: string): string {
    return `team-${jobId}-${normalizeTranscriptIdentifier(transcriptFileName)}`;
}

/**
 * Converts a direct transcript filename into a conservative id-safe segment.
 */
function normalizeTranscriptIdentifier(transcriptFileName: string): string {
    return (
        transcriptFileName
            .replace(/\.book$/iu, '')
            .replace(/[^A-Za-z0-9._-]+/gu, '-')
            .replace(/^[._-]+|[._-]+$/gu, '') || 'conversation'
    );
}
