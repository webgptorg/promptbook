/** @jest-environment jsdom */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { pdfSaveFormatDefinition } from './pdfSaveFormatDefinition';

/**
 * Captured jsPDF interactions used by the PDF regression tests.
 */
const mockPdfState: {
    renderSources: string[];
    metadata: string[];
    properties: Array<Record<string, string>>;
} = {
    renderSources: [],
    metadata: [],
    properties: [],
};

jest.mock('jspdf', () => ({
    jsPDF: jest.fn(() => ({
        internal: {
            pageSize: {
                getWidth: () => 612,
            },
        },
        setProperties: (properties: Record<string, string>) => {
            mockPdfState.properties.push(properties);
        },
        addMetadata: (metadata: string) => {
            mockPdfState.metadata.push(metadata);
        },
        html: async (source: HTMLElement) => {
            mockPdfState.renderSources.push(source.outerHTML);
        },
        output: () =>
            new TextEncoder().encode(
                [
                    '%PDF-1.3',
                    ...mockPdfState.renderSources,
                    ...mockPdfState.metadata,
                    JSON.stringify(mockPdfState.properties),
                ].join('\n'),
            ).buffer,
    })),
}));

describe('pdfSaveFormatDefinition', () => {
    beforeEach(() => {
        mockPdfState.renderSources = [];
        mockPdfState.metadata = [];
        mockPdfState.properties = [];
    });

    it('renders the HTML chat document as PDF content with Promptbook metadata', async () => {
        const exportedContent = (await pdfSaveFormatDefinition.getContent({
            title: 'Support demo',
            participants: [
                {
                    name: 'USER',
                    fullname: 'Pat Doe',
                    color: '#0ea5e9',
                },
                {
                    name: 'ASSISTANT',
                    fullname: 'Helpful Agent',
                    color: '#2563eb',
                },
            ],
            messages: [
                {
                    id: 'message-1',
                    sender: 'ASSISTANT',
                    content:
                        '# Summary\n\n- First\n- Second\n\n**Bold answer** with `inline code`.\n\n```ts\nconsole.log("hello");\n```',
                    isComplete: true,
                },
            ],
        })) as Uint8Array;
        const pdfText = Buffer.from(exportedContent).toString('utf-8');
        const renderedHtml = mockPdfState.renderSources.join('\n');
        const metadataText = [...mockPdfState.metadata, JSON.stringify(mockPdfState.properties)].join('\n');

        expect(pdfSaveFormatDefinition.label).toBe('PDF');
        expect(exportedContent).toBeInstanceOf(Uint8Array);
        expect(pdfText).toContain('%PDF-');
        expect(metadataText).toContain('Promptbook');
        expect(metadataText).toContain(PROMPTBOOK_ENGINE_VERSION);
        expect(metadataText).toContain(BOOK_LANGUAGE_VERSION);
        expect(renderedHtml).toContain('<style>');
        expect(renderedHtml).toContain('<article class="message-card"');
        expect(renderedHtml).toContain('Helpful Agent');
        expect(renderedHtml).toContain('<h1>Summary</h1>');
        expect(renderedHtml).toContain('<li>First</li>');
        expect(renderedHtml).toContain('<li>Second</li>');
        expect(renderedHtml).toContain('<strong>Bold answer</strong>');
        expect(renderedHtml).toContain('<code>inline code</code>');
        expect(renderedHtml).toContain('<pre><code');
        expect(renderedHtml).not.toContain('# Summary');
        expect(renderedHtml).not.toContain('**Bold answer**');
    });

    it('renders inline citation markers as numbered PDF source footnotes through the HTML export', async () => {
        const firstSourceUrl =
            'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-etnh35iYn7gbtUZ2oLfKarhHKOyWHF.pdf';
        const secondSourceUrl = 'https://ptbk.io/k/agent-guide.pdf';

        await pdfSaveFormatDefinition.getContent({
            title: 'Sources demo',
            participants: [
                {
                    name: 'ASSISTANT',
                    fullname: 'Helpful Agent',
                    color: '#2563eb',
                },
            ],
            messages: [
                {
                    id: 'message-1',
                    sender: 'ASSISTANT',
                    content: `Answer cites \u3010${firstSourceUrl}\u3011 and repeats \u3010${firstSourceUrl}\u3011.`,
                    isComplete: true,
                },
                {
                    id: 'message-2',
                    sender: 'ASSISTANT',
                    content: `Another answer cites \u3010${secondSourceUrl}\u3011.`,
                    isComplete: true,
                },
            ],
        });

        const renderedHtml = mockPdfState.renderSources.join('\n');

        expect(renderedHtml).toContain('<sup data-citation-footnote="1"><a href="#source-1">[1]</a></sup>');
        expect(renderedHtml).toContain('<sup data-citation-footnote="2"><a href="#source-2">[2]</a></sup>');
        expect(renderedHtml).toContain('<section class="document-sources" aria-label="Sources">');
        expect(renderedHtml).toContain(
            `<a href="${firstSourceUrl}" target="_blank" rel="noopener">[1] ${firstSourceUrl}</a>`,
        );
        expect(renderedHtml).toContain(
            `<a href="${secondSourceUrl}" target="_blank" rel="noopener">[2] ${secondSourceUrl}</a>`,
        );
        expect(renderedHtml.match(/id="source-1"/g)).toHaveLength(1);
        expect(renderedHtml).not.toContain(`\u3010${firstSourceUrl}\u3011`);
        expect(renderedHtml).not.toContain(`\u3010${secondSourceUrl}\u3011`);
        expect(renderedHtml).not.toContain('0:0');
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name
