import { TODO_any } from '../../../_packages/types.index';
import type { ChatMessage } from '../interfaces/ChatMessage';
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
    participants?: Record<string, { name: string; avatarUrl?: string }>,
): string {
    const branding = getPromptbookBranding(shareUrl);
    const header = headerMarkdown ? `${headerMarkdown}\n\n` : '';
    const content = messages
        .map((message) => {
            const from = (message as TODO_any).from as string;
            const sender =
                (participants && participants[from]?.name) ||
                (from === 'USER' || from === 'AGENT_user' ? 'You' : 'Assistant');
            return `${sender}:\n${message.content}\n`;
        })
        .join('\n');

    return header + branding + content;
}
