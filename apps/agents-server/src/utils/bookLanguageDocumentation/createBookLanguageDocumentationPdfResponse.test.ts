import { describe, expect, it } from '@jest/globals';
import type { string_markdown } from '../../../../../src/types/string_markdown';
import { parseBookLanguageDocumentationExportOptions } from './createBookLanguageDocumentationMarkdownResponse';
import { createBookLanguageDocumentationPdfHtml } from './createBookLanguageDocumentationPdfResponse';

describe('createBookLanguageDocumentationPdfHtml', () => {
    it('creates a self-contained printable document instead of rendering the application page', () => {
        const html = createBookLanguageDocumentationPdfHtml('# Book Language Manual' as string_markdown, 'cs');

        expect(html).toContain('<html lang="cs">');
        expect(html).toContain('<main><h1>Book Language Manual</h1></main>');
        expect(html).toContain('@page');
        expect(html).toContain('size: A4');
        expect(html).not.toContain('Print / Save as PDF');
    });
});

describe('parseBookLanguageDocumentationExportOptions', () => {
    it('uses all agents by default and supports a portable manual with no agents', () => {
        expect(parseBookLanguageDocumentationExportOptions(new URLSearchParams(), 'en')).toEqual({
            selectedAgentIds: null,
            language: 'en',
        });
        expect(
            parseBookLanguageDocumentationExportOptions(new URLSearchParams('agents=none&language=cs'), 'en'),
        ).toEqual({
            selectedAgentIds: [],
            language: 'cs',
        });
    });

    it('preserves an explicit unique agent selection', () => {
        expect(
            parseBookLanguageDocumentationExportOptions(
                new URLSearchParams('agent=researcher&agent=reviewer&agent=researcher'),
                'en',
            ),
        ).toEqual({
            selectedAgentIds: ['researcher', 'reviewer'],
            language: 'en',
        });
    });
});
