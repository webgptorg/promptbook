import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    appendChatAttachmentContext,
    appendChatAttachmentContextWithContent,
    formatChatAttachmentContentContext,
    formatChatAttachmentContext,
    normalizeChatAttachments,
    resolveChatAttachmentContents,
} from './chatAttachments';

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
    });

    it('keeps URL metadata and reports unsupported inline content types', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('%PDF-1.7', {
                headers: {
                    'content-type': 'application/pdf',
                },
            }),
        );

        const resolvedContents = await resolveChatAttachmentContents([
            {
                name: 'scan.pdf',
                type: 'application/pdf',
                url: 'https://cdn.acme.org/files/scan.pdf',
            },
        ]);

        const contentContext = formatChatAttachmentContentContext(resolvedContents);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(contentContext).toContain('Attached file contents:');
        expect(contentContext).toContain('unsupported content type for inline text');
        expect(contentContext).toContain('https://cdn.acme.org/files/scan.pdf');
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
            }) as any,
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
