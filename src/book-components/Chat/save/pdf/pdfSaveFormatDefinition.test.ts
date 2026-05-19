/** @jest-environment jsdom */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { pdfSaveFormatDefinition } from './pdfSaveFormatDefinition';

const mockPdfState: {
    texts: string[];
    metadata: string[];
    properties: Array<Record<string, string>>;
} = {
    texts: [],
    metadata: [],
    properties: [],
};

jest.mock('jspdf', () => ({
    jsPDF: jest.fn(() => {
        let pageCount = 1;

        return {
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
            setFont: jest.fn(),
            setFontSize: jest.fn(),
            setTextColor: jest.fn(),
            setDrawColor: jest.fn(),
            setFillColor: jest.fn(),
            setLineWidth: jest.fn(),
            line: jest.fn(),
            rect: jest.fn(),
            roundedRect: jest.fn(),
            link: jest.fn(),
            addPage: () => {
                pageCount += 1;
            },
            setPage: jest.fn(),
            getNumberOfPages: () => pageCount,
            getTextWidth: (text: string) => text.length * 4.8,
            splitTextToSize: (text: string, maxWidth: number) => {
                const maxCharacters = Math.max(1, Math.floor(maxWidth / 4.8));
                const lines: string[] = [];
                let remainingText = text;

                while (remainingText.length > maxCharacters) {
                    lines.push(remainingText.slice(0, maxCharacters));
                    remainingText = remainingText.slice(maxCharacters);
                }

                lines.push(remainingText);
                return lines;
            },
            text: (text: string | string[]) => {
                mockPdfState.texts.push(...(Array.isArray(text) ? text : [text]));
            },
            output: () =>
                new TextEncoder()
                    .encode(
                        [
                            '%PDF-1.3',
                            ...mockPdfState.texts,
                            ...mockPdfState.metadata,
                            JSON.stringify(mockPdfState.properties),
                        ].join('\n'),
                    )
                    .buffer,
        };
    }),
}));

describe('pdfSaveFormatDefinition', () => {
    beforeEach(() => {
        mockPdfState.texts = [];
        mockPdfState.metadata = [];
        mockPdfState.properties = [];
    });

    it('renders PDF chat exports with markdown and Promptbook metadata', () => {
        const exportedContent = pdfSaveFormatDefinition.getContent({
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
        }) as Uint8Array;
        const pdfText = Buffer.from(exportedContent).toString('utf-8');
        const renderedText = mockPdfState.texts.join('\n');
        const metadataText = [...mockPdfState.metadata, JSON.stringify(mockPdfState.properties)].join('\n');

        expect(pdfSaveFormatDefinition.label).toBe('PDF');
        expect(exportedContent).toBeInstanceOf(Uint8Array);
        expect(pdfText).toContain('%PDF-');
        expect(metadataText).toContain('Promptbook');
        expect(metadataText).toContain(PROMPTBOOK_ENGINE_VERSION);
        expect(metadataText).toContain(BOOK_LANGUAGE_VERSION);
        expect(renderedText).toContain('Helpful Agent');
        expect(renderedText).toContain('Summary');
        expect(renderedText).toContain('First');
        expect(renderedText).toContain('Second');
        expect(renderedText).toContain('Bold');
        expect(renderedText).toContain('answer');
        expect(renderedText).toContain('inline');
        expect(renderedText).toContain('code');
        expect(renderedText).not.toContain('# Summary');
        expect(renderedText).not.toContain('**Bold answer**');
    });
});
