import type { ChatMessage } from '../interfaces/ChatMessage';
import { ChatParticipant } from '../interfaces/ChatParticipant';
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
    participants?:  ReadonlyArray<ChatParticipant>
): string {
    const branding = getPromptbookBranding(shareUrl);
    const header = headerMarkdown ? `${headerMarkdown}\n\n` : '';
    const content = messages
        .map((message) => {

          const participant = (participants||[]).find(participant => participant.name === message.from);

            const fullname = participant?.fullname || message.from;
            return `${fullname}:\n${message.content}\n`;
        })
        .join('\n');

    return header + branding + content;
}
