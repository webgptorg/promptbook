import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { really_any } from '../organization/really_any';
import {
    appendChatAttachmentContext,
    appendChatAttachmentContextWithContent,
    formatChatAttachmentContentContext,
    formatChatAttachmentContext,
    normalizeChatAttachments,
    resolveChatAttachmentContents,
} from './chatAttachments';

/**
 * Stable Windows-1250 sample text fixture used to verify guessed decoding metadata.
 */
const WINDOWS_1250_SAMPLE_TEXT = 'Příliš žluťoučký kůň';

/**
 * Stable Windows-1250 bytes for `WINDOWS_1250_SAMPLE_TEXT`.
 */
const WINDOWS_1250_SAMPLE_BYTES = Uint8Array.from([
    80, 248, 237, 108, 105, 154, 32, 158, 108, 117, 157, 111, 117, 232, 107, 253, 32, 107, 249, 242,
]);

/**
 * Minimal PNG header fixture used to verify binary detection.
 */
const PNG_SAMPLE_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

/**
 * Encodes UTF-16LE text with BOM for subtitle fixtures.
 */
function encodeUtf16LeWithBom(text: string): Uint8Array {
    const body = Buffer.from(text, 'utf16le');
    return Uint8Array.from([0xff, 0xfe, ...body]);
}

describe('chatAttachments helpers', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('normalizes, filters invalid payloads, and de-duplicates URLs', () => {
        expect(
            normalizeChatAttachments([
                {
                    name: ' Document.pdf ',
                    type: 'application/pdf',
                    url: 'https://example.com/files/document.pdf',
                },
                {
                    name: 'Duplicate URL',
                    type: 'application/pdf',
                    url: 'https://example.com/files/document.pdf',
                },
                {
                    name: '',
                    type: '',
                    url: 'https://example.com/files/hello.txt',
                },
                {
                    name: 'Bad protocol',
                    type: 'text/plain',
                    url: 'javascript:alert(1)',
                },
                {
                    name: 'Missing URL',
                    type: 'text/plain',
                },
                null,
            ]),
        ).toEqual([
            {
                name: 'Document.pdf',
                type: 'application/pdf',
                url: 'https://example.com/files/document.pdf',
            },
            {
                name: 'hello.txt',
                type: 'application/octet-stream',
                url: 'https://example.com/files/hello.txt',
            },
        ]);
    });

    it('formats attachment context as markdown lines', () => {
        expect(
            formatChatAttachmentContext([
                {
                    name: 'report.pdf',
                    type: 'application/pdf',
                    url: 'https://example.com/report.pdf',
                },
            ]),
        ).toBe(
            [
                'Attached files:',
                '- report.pdf (application/pdf): https://example.com/report.pdf',
                'Use these URLs when you need to inspect the attached files before answering.',
            ].join('\n'),
        );
    });

    it('appends attachment context to non-empty message content', () => {
        expect(
            appendChatAttachmentContext('Please summarize this file.', [
                {
                    name: 'report.pdf',
                    type: 'application/pdf',
                    url: 'https://example.com/report.pdf',
                },
            ]),
        ).toContain('Attached files:');
    });

    it('returns message content unchanged when there are no attachments', () => {
        expect(appendChatAttachmentContext('Just text', [])).toBe('Just text');
    });

    it('resolves attachment content and appends it to message context', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('Quarterly revenue: 124000 USD', {
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                },
            }),
        );

        const message = await appendChatAttachmentContextWithContent('Please summarize the report.', [
            {
                name: 'report.txt',
                type: 'text/plain',
                url: 'https://cdn.acme.org/files/report.txt',
            },
        ]);

        expect(fetchSpy).toHaveBeenCalledWith('https://cdn.acme.org/files/report.txt', expect.any(Object));
        expect(message).toContain('Attached file contents:');
        expect(message).toContain('Quarterly revenue: 124000 USD');
        expect(message).toContain('Decoding: utf-8');
    });

    it('decodes unknown-extension text attachments even when MIME type is generic', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello\n', {
                headers: {
                    'content-type': 'application/octet-stream',
                },
            }),
        );

        const resolvedContents = await resolveChatAttachmentContents([
            {
                name: 'captions.foo',
                type: 'application/octet-stream',
                url: 'https://cdn.acme.org/files/captions.foo',
            },
        ]);

        const contentContext = formatChatAttachmentContentContext(resolvedContents);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(contentContext).toContain('Attached file contents:');
        expect(contentContext).toContain('Hello');
        expect(contentContext).toContain('Decoding: utf-8');
        expect(contentContext).toContain('https://cdn.acme.org/files/captions.foo');
    });

    it('decodes UTF-16LE subtitle attachments with BOM', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(encodeUtf16LeWithBom('1\r\n00:00:00,000 --> 00:00:01,500\r\nAhoj\r\n'), {
                headers: {
                    'content-type': 'application/octet-stream',
                },
            }),
        );

        const message = await appendChatAttachmentContextWithContent('Summarize the subtitles.', [
            {
                name: 'episode.srt',
                type: 'application/octet-stream',
                url: 'https://cdn.acme.org/files/episode.srt',
            },
        ]);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(message).toContain('Ahoj');
        expect(message).toContain('Decoding: utf-16le');
    });

    it('reports binary attachments without returning garbage text', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(PNG_SAMPLE_BYTES, {
                headers: {
                    'content-type': 'image/png',
                },
            }),
        );

        const resolvedContents = await resolveChatAttachmentContents([
            {
                name: 'diagram.png',
                type: 'image/png',
                url: 'https://cdn.acme.org/files/diagram.png',
            },
        ]);

        const contentContext = formatChatAttachmentContentContext(resolvedContents);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(contentContext).toContain('file appears to be binary and was not inlined as text');
        expect(contentContext).toContain('Warnings: File content looks binary, so text decoding was skipped.');
    });

    it('includes guessed-encoding warnings when fallback decoding is used', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(WINDOWS_1250_SAMPLE_BYTES, {
                headers: {
                    'content-type': 'text/plain',
                },
            }) as really_any,
        );

        const message = await appendChatAttachmentContextWithContent('Read this note.', [
            {
                name: 'note.txt',
                type: 'text/plain',
                url: 'https://cdn.acme.org/files/note.txt',
            },
        ]);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(message).toContain(WINDOWS_1250_SAMPLE_TEXT);
        expect(message).toContain('Encoding was guessed as `windows-1250`.');
    });

    it('does not download private-network attachment URLs by default', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch');

        const message = await appendChatAttachmentContextWithContent('Analyze this local file.', [
            {
                name: 'local.txt',
                type: 'text/plain',
                url: 'http://localhost/private/local.txt',
            },
        ]);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(message).toContain('private-network URL is not allowed');
    });

    it('allows downloading localhost attachment URLs when requested', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('Local content', {
                headers: {
                    'content-type': 'text/plain',
                },
            }) as really_any,
        );

        const message = await appendChatAttachmentContextWithContent(
            'Analyze this local file.',
            [
                {
                    name: 'local.txt',
                    type: 'text/plain',
                    url: 'http://localhost/private/local.txt',
                },
            ],
            { allowLocalhost: true },
        );

        expect(fetchSpy).toHaveBeenCalled();
        expect(message).toContain('Local content');
    });
});
