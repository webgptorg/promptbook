import { buildChatHtml } from '../../../../../../../../src/book-components/Chat/save/html/htmlSaveFormatDefinition';
import type { ChatMessage } from '../../../../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../../../../src/book-components/Chat/types/ChatParticipant';
import { createChatExportFilename } from '../../../../../../../../src/book-components/Chat/save/_common/createChatExportFilename';
import { NextRequest, NextResponse } from 'next/server';
import { renderHtmlToPdfOnServer } from '@/src/utils/chatExport/renderHtmlToPdfOnServer';

/**
 * PDF export requires the Node.js runtime because it depends on Playwright.
 */
export const runtime = 'nodejs';

/**
 * Minimal request payload accepted by the chat PDF export endpoint.
 *
 * @private internal type for POST /api/chat/export/pdf
 */
type ChatPdfExportRequestBody = {
    readonly title: string;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly participants: ReadonlyArray<ChatParticipant>;
};

/**
 * Builds a server-rendered PDF from the standalone HTML chat export.
 */
export async function POST(request: NextRequest) {
    let requestBody: ChatPdfExportRequestBody;

    try {
        requestBody = (await request.json()) as ChatPdfExportRequestBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    if (
        typeof requestBody?.title !== 'string' ||
        !Array.isArray(requestBody.messages) ||
        !Array.isArray(requestBody.participants)
    ) {
        return NextResponse.json(
            { error: 'Expected `title`, `messages`, and `participants` in the PDF export payload.' },
            { status: 400 },
        );
    }

    try {
        const pdfBuffer = await renderHtmlToPdfOnServer(
            buildChatHtml(requestBody.title, requestBody.messages, requestBody.participants),
        );
        const filename = createChatExportFilename(requestBody.title, 'pdf');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Failed to export chat PDF:', error);
        return NextResponse.json({ error: 'Failed to export chat as PDF.' }, { status: 500 });
    }
}
