import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { addUtmParamsToUrl } from './addUtmParamsToUrl';
import { createShortLinkForChat } from './createShortLinkForChat';
import { downloadFile } from './downloadFile';
import type { ExportFormat } from './ExportFormat';
import { generatePdfContent } from './generatePdfContent';
import { generateQrDataUrl } from './generateQrDataUrl';
import { messagesToHtml } from './messagesToHtml';
import { messagesToJson } from './messagesToJson';
import { messagesToMarkdown } from './messagesToMarkdown';
import { messagesToText } from './messagesToText';

/**
 * Exports chat messages in the specified format
 *
 * @private utility of `<Chat/>` component
 */
export async function exportChatHistory(
    messages: ChatMessage[],
    format: ExportFormat,
    headerMarkdown?: string,
    participants?: ReadonlyArray<ChatParticipant>,
): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const baseFilename = `chat-history-${timestamp}`;

    const currentUrl = window.location.href;
    const utmUrl = addUtmParamsToUrl(currentUrl, format);
    const shareUrl = await createShortLinkForChat(utmUrl);

    const needsQr = format === 'pdf' || format === 'md' || format === 'html';
    const qrDataUrl = needsQr ? await generateQrDataUrl(shareUrl) : null;

    switch (format) {
        case 'txt':
            downloadFile(
                messagesToText(messages, shareUrl, headerMarkdown, participants),
                `${baseFilename}.txt`,
                'text/plain',
            );
            break;

        case 'md':
            downloadFile(
                messagesToMarkdown(messages, shareUrl, qrDataUrl, headerMarkdown, participants),
                `${baseFilename}.md`,
                'text/markdown',
            );
            break;

        case 'html':
            downloadFile(
                messagesToHtml(messages, shareUrl, qrDataUrl, headerMarkdown, participants),
                `${baseFilename}.html`,
                'text/html',
            );
            break;

        case 'json':
            downloadFile(messagesToJson(messages, shareUrl), `${baseFilename}.json`, 'application/json');
            break;

        case 'pdf':
            generatePdfContent(messages, shareUrl, qrDataUrl, headerMarkdown, participants);
            break;

        default:
            console.error('Unsupported export format:', format);
    }
}

/**
 * TODO: [😬] Delete this parallel chat history export
 */
