import { PROMPTBOOK_LOGO_URL } from '../../../config';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { ChatMessage } from '../interfaces/ChatMessage';
import type { ChatParticipant } from '../interfaces/ChatParticipant';
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
    participants?: ReadonlyArray<ChatParticipant>,
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
            const participant = (participants || []).find((participant) => participant.name === message.from);

            const fullname = participant?.fullname || message.from;
            const avatarSrc = participant?.avatarSrc;
            const senderMd = `**${fullname}**`;
            const avatarMd = avatarSrc ? `![${fullname}](${avatarSrc}) ` : '';
            return `${avatarMd}${senderMd}:\n\n${message.content}\n`;
        })
        .join('\n---\n\n');

    return `${headerParts.join('\n')}\n${
        headerMarkdown ? headerMarkdown + '\n\n' : ''
    }# Chat History\n\n${branding}${content}`;
}
