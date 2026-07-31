import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import type { string_markdown } from '../../../../../src/types/string_markdown';
import { parseBookLanguageDocumentationExportOptions } from './createBookLanguageDocumentationMarkdownResponse';
import { createBookLanguageDocumentationPdfHtml } from './createBookLanguageDocumentationPdfResponse';

describe('createBookLanguageDocumentationPdfHtml', () => {
    it('creates a self-contained printable document instead of rendering the application page', () => {
        const html = createBookLanguageDocumentationPdfHtml({
            markdown: '# Book Language Manual' as string_markdown,
            language: 'cs',
            logoDataUrl: null,
        });

        expect(html).toContain('<html lang="cs">');
        expect(html).toContain('<h1>Book Language Manual</h1>');
        expect(html).toContain('@page');
        expect(html).toContain('size: A4');
        expect(html).not.toContain('Print / Save as PDF');
    });

    it('brands the exported manual with Promptbook', () => {
        const html = createBookLanguageDocumentationPdfHtml({
            markdown: '# Book Language Manual' as string_markdown,
            language: 'en',
            logoDataUrl: 'data:image/png;base64,promptbook-logo',
        });

        expect(html).toContain('<meta name="application-name" content="Promptbook" />');
        expect(html).toContain('class="manual-cover"');
        expect(html).toContain('src="data:image/png;base64,promptbook-logo"');
        expect(html).toContain('<footer class="manual-footer">');
    });

    it('groups headings into sections so pages break between chapters', () => {
        const html = createBookLanguageDocumentationPdfHtml({
            markdown: spaceTrim(`
                # Manual

                ## First chapter

                ### First section

                ## Second chapter
            `) as string_markdown,
            language: 'en',
            logoDataUrl: null,
        });

        expect(html).toContain('<section class="manual-part">');
        expect(html).toContain('<section class="manual-chapter">');
        expect(html).toContain('<section class="manual-section">');
        expect(html.match(/<section class="manual-chapter">/g)).toHaveLength(2);
        expect(html.match(/<\/section>/g)).toHaveLength(4);
    });

    it('syntax highlights Book sources with the Book editor colors', () => {
        const html = createBookLanguageDocumentationPdfHtml({
            markdown: spaceTrim(`
                # Manual

                \`\`\`book
                Example Agent

                GOAL Help with {Something}
                \`\`\`
            `) as string_markdown,
            language: 'en',
            logoDataUrl: null,
        });

        expect(html).toContain('<pre class="book-source">');
        expect(html).toContain('<span class="book-syntax-title">Example Agent</span>');
        expect(html).toContain('<span class="book-syntax-commitment">GOAL</span>');
        expect(html).toContain('<span class="book-syntax-parameter">{Something}</span>');
        expect(html).toContain('.book-syntax-commitment {');
    });
});

describe('parseBookLanguageDocumentationExportOptions', () => {
    it('uses all agents by default and supports a portable manual with no agents', () => {
        expect(parseBookLanguageDocumentationExportOptions(new URLSearchParams(), 'en')).toEqual({
            selectedAgentIds: null,
            language: 'en',
            isLowLevelCommitmentsIncluded: false,
        });
        expect(
            parseBookLanguageDocumentationExportOptions(new URLSearchParams('agents=none&language=cs'), 'en'),
        ).toEqual({
            selectedAgentIds: [],
            language: 'cs',
            isLowLevelCommitmentsIncluded: false,
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
            isLowLevelCommitmentsIncluded: false,
        });
    });

    it('opts into low level commitments only when explicitly requested', () => {
        expect(
            parseBookLanguageDocumentationExportOptions(new URLSearchParams('lowLevelCommitments=true'), 'en')
                .isLowLevelCommitmentsIncluded,
        ).toBe(true);
        expect(
            parseBookLanguageDocumentationExportOptions(new URLSearchParams('lowLevelCommitments=false'), 'en')
                .isLowLevelCommitmentsIncluded,
        ).toBe(false);
    });
});
