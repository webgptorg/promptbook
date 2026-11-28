import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { getChatMessageTimingDisplay } from './getChatMessageTimingDisplay';
import { getPromptbookBranding } from './getPromptbookBranding';

/**
 * Converts chat messages to plain text format
 *
 * @private utility of `<Chat/>` component
 */
export function messagesToText(
    messages: ChatMessage[],
    shareUrl: string,
    headerMarkdown?: string,
    participants?: ReadonlyArray<ChatParticipant>,
): string {
    const branding = getPromptbookBranding(shareUrl);
    const header = headerMarkdown ? `${headerMarkdown}\n\n` : '';
    const content = messages
        .map((message) => {
            const participant = (participants || []).find((participant) => participant.name === message.sender);

            const fullname = participant?.fullname || message.sender;
            const timing = getChatMessageTimingDisplay(message);
            const timestampLabel = timing ? ` [${timing.fullLabel}]` : '';
            return `${fullname}${timestampLabel}:\n${message.content}\n`;
        })
        .join('\n');

    return header + branding + content;
}
