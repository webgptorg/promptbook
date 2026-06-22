import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    extractCitationLabelFromHtml,
    extractCitationLabelFromPdfBytes,
    extractCitationLabelFromPlainText,
    resolveCitationSourceLabel,
} from './resolveCitationSourceLabel';

/**
 * Original process fetch implementation restored after each test.
 *
 * @private test constant
 */
const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});

describe('resolveCitationSourceLabel', () => {
    it('extracts Open Graph, title, and heading labels from HTML', () => {
        expect(
            extractCitationLabelFromHtml(`
                <!doctype html>
                <html>
                    <head>
                        <meta property="og:title" content="Metadata Page Title" />
                        <title>Browser Page Title</title>
                    </head>
                    <body>
                        <h1>Document Heading</h1>
                    </body>
                </html>
            `),
        ).toBe('Metadata Page Title');
    });

    it('extracts markdown headings from text documents', () => {
        expect(extractCitationLabelFromPlainText('\n# Annual Report 2020\n\nBody text')).toBe('Annual Report 2020');
    });

    it('extracts PDF title metadata', () => {
        const pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Title (Annual Report 2020) >>\nendobj', 'latin1');

        expect(extractCitationLabelFromPdfBytes(pdfBytes)).toBe('Annual Report 2020');
    });

    it('fetches a source and resolves a page title', async () => {
        global.fetch = jest.fn(async () => {
            return new Response('<!doctype html><title>Fetched Source Title</title>', {
                headers: {
                    'content-type': 'text/html; charset=utf-8',
                },
            });
        }) as typeof fetch;

        await expect(
            resolveCitationSourceLabel({
                source: 'https://example.com/source',
            }),
        ).resolves.toBe('Fetched Source Title');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com/source',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Accept: expect.stringContaining('text/html'),
                }),
            }),
        );
    });
});
