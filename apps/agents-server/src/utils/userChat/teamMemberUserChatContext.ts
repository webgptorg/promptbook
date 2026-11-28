import type { ChatMessage } from '@promptbook-local/types';

/**
 * JSON property stored on the first message of a frozen TEAM conversation.
 *
 * A message-level property keeps the relation backwards-compatible without changing the UserChat table.
 */
const TEAM_MEMBER_USER_CHAT_CONTEXT_KEY = '__promptbookTeamMemberChat';

/**
 * Primary chat information attached to a frozen teammate conversation.
 */
export type TeamMemberUserChatContext = {
    readonly version: 1;
    readonly primaryAgentPermanentId: string;
    readonly primaryAgentName: string;
    readonly primaryChatId: string;
};

/**
 * Adds the primary-chat relation to the first message of a frozen teammate transcript.
 */
export function attachTeamMemberUserChatContext(
    messages: ReadonlyArray<ChatMessage>,
    context: TeamMemberUserChatContext,
): Array<ChatMessage> {
    const firstMessage = messages[0];
    if (!firstMessage) {
        return [...messages];
    }

    return [
        {
            ...firstMessage,
            [TEAM_MEMBER_USER_CHAT_CONTEXT_KEY]: context,
        } as ChatMessage,
        ...messages.slice(1),
    ];
}

/**
 * Reads the optional primary-chat relation from a frozen teammate transcript.
 */
export function getTeamMemberUserChatContext(messages: ReadonlyArray<ChatMessage>): TeamMemberUserChatContext | null {
    const firstMessage = messages[0] as (ChatMessage & Record<string, unknown>) | undefined;
    const value = firstMessage?.[TEAM_MEMBER_USER_CHAT_CONTEXT_KEY];

    return isTeamMemberUserChatContext(value) ? value : null;
}

/**
 * Validates the compact context stored in untrusted persisted message JSON.
 */
function isTeamMemberUserChatContext(value: unknown): value is TeamMemberUserChatContext {
    return Boolean(
        value &&
            typeof value === 'object' &&
            (value as TeamMemberUserChatContext).version === 1 &&
            typeof (value as TeamMemberUserChatContext).primaryAgentPermanentId === 'string' &&
            typeof (value as TeamMemberUserChatContext).primaryAgentName === 'string' &&
            typeof (value as TeamMemberUserChatContext).primaryChatId === 'string',
    );
}
