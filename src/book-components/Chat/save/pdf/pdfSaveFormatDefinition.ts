import { keepUnused } from '../../../../utils/organization/keepUnused';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';
import { htmlSaveFormatDefinition } from '../html/htmlSaveFormatDefinition';

/**
 * Converts HTML to PDF buffer using a PDF library.
 * This is a placeholder for actual implementation.
 * Replace with real conversion logic as needed.
 *
 * @private
 */
async function htmlToPdfBuffer(html: string): Promise<Uint8Array> {
    // Example: Use a library like 'html-pdf' or 'puppeteer' here
    keepUnused(html);
    throw new Error('PDF conversion not implemented. Integrate a PDF library here.');
}

/**
 * PDF export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const pdfSaveFormatDefinition = {
    formatName: 'pdf',
    label: 'Pdf',
    getContent: async (chatExportData) => {
        // const { messages } = chatExportData;

        const html = await htmlSaveFormatDefinition.getContent(chatExportData);

        keepUnused(htmlToPdfBuffer);
        // <- TODO: [😬] Take chat save to PDF from existing parallel implementation

        keepUnused(html);

        // PDF conversion should be implemented here (sync or pre-generated)
        // For now, return a placeholder string
        return '[PDF chat save not implemented. Integrate a PDF library for conversion.]';
    },
    mimeType: 'application/pdf',
    fileExtension: 'pdf',
} as const satisfies ChatSaveFormatDefinition;
