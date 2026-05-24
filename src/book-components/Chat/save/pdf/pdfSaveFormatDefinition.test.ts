/** @jest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { pdfSaveFormatDefinition } from './pdfSaveFormatDefinition';

/**
 * Captured jsPDF interactions used by the PDF regression tests.
 */
const mockPdfState: {
    addedPages: number;
    imagePages: Array<{
        format: string;
        sourceHeight: number;
        sourceWidth: number;
        width: number;
        height: number;
    }>;
    renderSources: string[];
    metadata: string[];
    properties: Array<Record<string, string>>;
} = {
    addedPages: 0,
    imagePages: [],
    renderSources: [],
    metadata: [],
    properties: [],
};

/**
 * Canvas size returned by the mocked browser renderer.
 */
const mockCanvasSize = {
    width: 1800,
    height: 1200,
};

/**
 * Czech text with diacritics used to guard against the original PDF glyph-positioning regression.
 */
const DIACRITIC_CHAT_TEXT = String.fromCharCode(
    68,
    111,
    98,
    114,
    253,
    32,
    100,
    101,
    110,
    44,
    32,
    112,
    111,
    109,
    367,
    382,
    117,
    32,
    115,
    32,
    109,
    283,
    115,
    116,
    115,
    107,
    111,
    117,
    32,
    269,
    225,
    115,
    116,
    237,
    32,
    80,
    114,
    97,
    104,
    97,
    32,
    49,
    51,
    46,
);

jest.mock('html-to-image', () => ({
    toCanvas: jest.fn(async (source: HTMLElement) => {
        mockPdfState.renderSources.push(source.outerHTML);

        const canvas = document.createElement('canvas');
        canvas.width = mockCanvasSize.width;
        canvas.height = mockCanvasSize.height;

        return canvas;
    }),
}));

jest.mock('jspdf', () => ({
    jsPDF: jest.fn(() => ({
        internal: {
            pageSize: {
                getWidth: () => 612,
                getHeight: () => 792,
            },
        },
        setProperties: (properties: Record<string, string>) => {
            mockPdfState.properties.push(properties);
        },
        addMetadata: (metadata: string) => {
            mockPdfState.metadata.push(metadata);
        },
        addPage: () => {
            mockPdfState.addedPages += 1;
        },
        addImage: (
            imageData: HTMLCanvasElement,
            format: string,
            _x: number,
            _y: number,
            width: number,
            height: number,
        ) => {
            mockPdfState.imagePages.push({
                format,
                sourceHeight: imageData.height,
                sourceWidth: imageData.width,
                width,
                height,
            });
        },
        html: async () => {
            throw new Error('jsPDF.html should not be used for chat PDF exports');
        },
        output: () =>
            new TextEncoder().encode(
                [
                    '%PDF-1.3',
                    ...mockPdfState.renderSources,
                    JSON.stringify(mockPdfState.imagePages),
                    ...mockPdfState.metadata,
                    JSON.stringify(mockPdfState.properties),
                ].join('\n'),
            ).buffer,
    })),
}));

describe('pdfSaveFormatDefinition', () => {
    beforeEach(() => {
        mockPdfState.addedPages = 0;
        mockPdfState.imagePages = [];
        mockPdfState.renderSources = [];
        mockPdfState.metadata = [];
        mockPdfState.properties = [];
        mockCanvasSize.width = 1800;
        mockCanvasSize.height = 1200;
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
            () =>
                ({
                    drawImage: jest.fn(),
                    fillRect: jest.fn(),
                    fillStyle: '#ffffff',
                } as unknown as CanvasRenderingContext2D),
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
                    content: `# Summary\n\n- First\n- Second\n\n**${DIACRITIC_CHAT_TEXT}** with \`inline code\`.\n\n\`\`\`ts\nconsole.log("hello");\n\`\`\``,
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
        expect(renderedHtml).toContain(`<strong>${DIACRITIC_CHAT_TEXT}</strong>`);
        expect(renderedHtml).toContain('<code>inline code</code>');
        expect(renderedHtml).toContain('<pre><code');
        expect(renderedHtml).not.toContain('# Summary');
        expect(renderedHtml).not.toContain(`**${DIACRITIC_CHAT_TEXT}`);
        expect(mockPdfState.addedPages).toBe(0);
        expect(mockPdfState.imagePages).toHaveLength(1);
        expect(mockPdfState.imagePages[0]).toMatchObject({
            format: 'PNG',
            sourceHeight: 1200,
            sourceWidth: 1800,
            width: 612,
        });
        expect(mockPdfState.imagePages[0]?.height).toBeCloseTo(408);
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

    it('splits browser-rendered chat images across PDF pages', async () => {
        mockCanvasSize.height = 5000;

        await pdfSaveFormatDefinition.getContent({
            title: 'Long chat',
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
                    content: 'Long answer',
                    isComplete: true,
                },
            ],
        });

        expect(mockPdfState.addedPages).toBe(2);
        expect(mockPdfState.imagePages).toHaveLength(3);
        expect(mockPdfState.imagePages.map((page) => page.sourceHeight)).toEqual([2329, 2329, 342]);
    });
});

// Note: [💞] Ignore a discrepancy between file name and entity name
