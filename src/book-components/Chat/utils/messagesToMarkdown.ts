import { TODO_any } from '../../../_packages/types.index';
import { PROMPTBOOK_LOGO_URL } from '../../../config';
import type { ChatMessage } from '../interfaces/ChatMessage';
import { getPromptbookBranding } from './getPromptbookBranding';

/**
 * Converts chat messages to Markdown format
 * 
 * @private utility of `<Chat/>` component
 */
export function messagesToMarkdown(
    messages: ChatMessage[],
    shareUrl: string,
    qrDataUrl?: string | null,
    headerMarkdown?: string,
    participants?: Record<string, { name: string; avatarUrl?: string }>,
): string {
    const branding = getPromptbookBranding(shareUrl);
    const headerParts: string[] = [];
    headerParts.push(`[![Promptbook](${PROMPTBOOK_LOGO_URL})](${shareUrl})`);
    headerParts.push('');
    headerParts.push(`Share this chat: ${shareUrl}`);
    if (qrDataUrl) {
        headerParts.push('');
        headerParts.push(`![Chat QR code](${qrDataUrl})`);
    }
    headerParts.push('');

    const content = messages
        .map((message) => {
            const from = (message as TODO_any).from as string;
            const name =
                (participants && participants[from]?.name) ||
                (from === 'USER' || from === 'AGENT_user' ? 'You' : 'Assistant');
            const avatar = participants && participants[from]?.avatarUrl;
            const senderMd = `**${name}**`;
            const avatarMd = avatar ? `![${name}](${avatar}) ` : '';
            return `${avatarMd}${senderMd}:\n\n${message.content}\n`;
        })
        .join('\n---\n\n');

    return `${headerParts.join('\n')}\n${
        headerMarkdown ? headerMarkdown + '\n\n' : ''
    }# Chat History\n\n${branding}${content}`;
}
