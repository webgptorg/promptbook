// DOCX Save Format Definition for <Chat/>
import { spaceTrim } from 'packages/utils/spaceTrim';
// [🧠] Consider using a library like 'docx' or 'html-docx-js' for real conversion

export const docxSaveFormatDefinition = {
    format: 'docx',
    label: 'DOCX',
    description: 'Export chat as a DOCX document',
    fileExtension: '.docx',
    async save(content: string, options?: { from: 'markdown' | 'html' }) {
        const trimmedContent = spaceTrim(content);

        // [🧠] Placeholder: Convert Markdown/HTML to DOCX binary here
        // For now, just return the trimmed content as a Buffer (not a real DOCX)
        // Replace with actual DOCX generation logic using a suitable library

        return Buffer.from(trimmedContent, 'utf-8');
    },
};
