import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';
import { downloadBlob, parseFilenameFromContentDisposition } from '../download/browserFileDownload';

/**
 * Payload sent to the Agents Server PDF export endpoint.
 *
 * @private internal type for `downloadChatPdfFromServer`
 */
type DownloadChatPdfFromServerOptions = {
    readonly title: string;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly participants: ReadonlyArray<ChatParticipant>;
};

/**
 * Requests a server-rendered chat PDF and triggers the browser download.
 *
 * @param options - Chat export payload.
 */
export async function downloadChatPdfFromServer(options: DownloadChatPdfFromServerOptions): Promise<void> {
    const response = await fetch('/api/chat/export/pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: options.title,
            messages: options.messages,
            participants: options.participants.map(serializeChatParticipantForExport),
        }),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to export chat as PDF.');
    }

    const pdfBlob = await response.blob();
    const filename =
        parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) || 'chat-export.pdf';

    downloadBlob(pdfBlob, filename);
}

/**
 * Normalizes participant data so the payload stays JSON-safe when custom color helpers are used.
 *
 * @param participant - One chat participant.
 * @returns Serializable participant payload.
 *
 * @private helper for `downloadChatPdfFromServer`
 */
function serializeChatParticipantForExport(participant: ChatParticipant): ChatParticipant {
    return {
        ...participant,
        color: participant.color ? String(participant.color) : undefined,
    };
}
