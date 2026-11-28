import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';
import { buildChatPdf } from './buildChatPdf';

/**
 * PDF export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const pdfSaveFormatDefinition = {
    formatName: 'pdf',
    label: 'PDF',
    getContent: ({ title, messages, participants }) => buildChatPdf(title, messages, participants),
    mimeType: 'application/pdf',
    fileExtension: 'pdf',
} as const satisfies ChatSaveFormatDefinition;

// TODO: !!! Add QR code with branding to the footer
// TODO: !!! Add print option
