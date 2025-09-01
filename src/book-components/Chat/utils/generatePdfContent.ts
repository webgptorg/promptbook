import type { ChatMessage } from '../interfaces/ChatMessage';
import type { ChatParticipant } from '../interfaces/ChatParticipant';
import { messagesToHtml } from './messagesToHtml';

/**
 * Generates PDF content using HTML and triggers print dialog
 *
 * @private utility of `<Chat/>` component
 */
export function generatePdfContent(
    messages: ChatMessage[],
    shareUrl: string,
    qrDataUrl?: string | null,
    headerMarkdown?: string,
    participants?: ReadonlyArray<ChatParticipant>,
): void {
    const htmlContent = messagesToHtml(messages, shareUrl, qrDataUrl, headerMarkdown, participants);

    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print the chat history');
        return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}
