import { describe, expect, it } from '@jest/globals';
import {
    appendChatAttachmentContext,
    formatChatAttachmentContext,
    normalizeChatAttachments,
} from './chatAttachments';

describe('chatAttachments helpers', () => {
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
});
