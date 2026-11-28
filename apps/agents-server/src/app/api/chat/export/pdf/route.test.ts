import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { renderHtmlToPdfOnServer } from '@/src/utils/chatExport/renderHtmlToPdfOnServer';

jest.mock('@/src/utils/chatExport/renderHtmlToPdfOnServer', () => ({
    renderHtmlToPdfOnServer: jest.fn(),
}));

jest.mock('@/src/utils/getCurrentUser', () => ({
    getCurrentUser: jest.fn(),
}));

/**
 * Typed access to the mocked PDF renderer.
 */
const renderHtmlToPdfOnServerMock = renderHtmlToPdfOnServer as jest.MockedFunction<typeof renderHtmlToPdfOnServer>;

/**
 * Typed access to the mocked current-user helper.
 */
const getCurrentUserMock = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('POST /api/chat/export/pdf', () => {
    beforeEach(() => {
        getCurrentUserMock.mockReset();
        renderHtmlToPdfOnServerMock.mockReset();
    });

    it('returns a downloadable PDF rendered from the standalone chat HTML export', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 101,
            username: 'pdf-export-user',
            isAdmin: false,
            profileImageUrl: null,
        });
        renderHtmlToPdfOnServerMock.mockResolvedValue(Buffer.from('pdf-bytes'));

        const response = await POST(
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Demo chat',
                    messages: [
                        {
                            id: 'message-1',
                            createdAt: '2026-05-30T12:00:00.000Z',
                            sender: 'AGENT',
                            content: 'Hello from the server-rendered PDF.',
                            isComplete: true,
                        },
                    ],
                    participants: [],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/pdf');
        expect(response.headers.get('Content-Disposition')).toMatch(
            /^attachment; filename="demo-chat-\d{4}-\d{2}-\d{2}\.pdf"; filename\*=UTF-8''demo-chat-\d{4}-\d{2}-\d{2}\.pdf$/,
        );
        expect(renderHtmlToPdfOnServerMock).toHaveBeenCalledTimes(1);
        expect(renderHtmlToPdfOnServerMock.mock.calls[0]?.[0]).toContain('Demo chat');
        expect(renderHtmlToPdfOnServerMock.mock.calls[0]?.[0]).toContain('Conversation export');
        await expect(response.text()).resolves.toBe('pdf-bytes');
    });

    it('rejects unauthenticated callers before parsing the PDF payload', async () => {
        getCurrentUserMock.mockResolvedValue(null);

        const response = await POST(
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: 'not json',
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
        expect(renderHtmlToPdfOnServerMock).not.toHaveBeenCalled();
    });

    it('rejects malformed payloads', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 102,
            username: 'malformed-pdf-export-user',
            isAdmin: false,
            profileImageUrl: null,
        });

        const response = await POST(
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Broken export',
                    messages: 'nope',
                    participants: [],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: 'Expected `title`, `messages`, and `participants` in the PDF export payload.',
        });
    });

    it('rate limits repeated PDF renders per authenticated user', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 103,
            username: 'rate-limited-pdf-export-user',
            isAdmin: false,
            profileImageUrl: null,
        });
        renderHtmlToPdfOnServerMock.mockResolvedValue(Buffer.from('pdf-bytes'));

        const createRequest = () =>
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Rate limited chat',
                    messages: [],
                    participants: [],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const response = await POST(createRequest());
            expect(response.status).toBe(200);
        }

        const rateLimitedResponse = await POST(createRequest());

        expect(rateLimitedResponse.status).toBe(429);
        expect(rateLimitedResponse.headers.get('Retry-After')).toMatch(/^\d+$/);
        await expect(rateLimitedResponse.json()).resolves.toEqual({
            error: expect.stringContaining('Rate limit exceeded for `PDF` chat exports.'),
        });
        expect(renderHtmlToPdfOnServerMock).toHaveBeenCalledTimes(5);
    });

    it('sanitizes unsafe URLs and markdown HTML before rendering', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 104,
            username: 'sanitized-pdf-export-user',
            isAdmin: false,
            profileImageUrl: null,
        });
        renderHtmlToPdfOnServerMock.mockResolvedValue(Buffer.from('pdf-bytes'));

        const response = await POST(
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Unsafe URLs',
                    messages: [
                        {
                            id: 'message-1',
                            createdAt: '2026-05-30T12:00:00.000Z',
                            sender: 'AGENT',
                            content:
                                '<img src="http://127.0.0.1/private.png" onerror="alert(1)" alt="blocked image">',
                            isComplete: true,
                            citations: [
                                {
                                    id: '1',
                                    source: 'Internal metadata',
                                    url: 'http://169.254.169.254/latest/meta-data',
                                },
                            ],
                        },
                    ],
                    participants: [
                        {
                            name: 'AGENT',
                            fullname: 'Agent',
                            avatarSrc: 'http://localhost/avatar.png',
                        },
                    ],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );

        const html = renderHtmlToPdfOnServerMock.mock.calls[0]?.[0] || '';

        expect(response.status).toBe(200);
        expect(html).not.toContain('onerror');
        expect(html).not.toContain('src="http://127.0.0.1/private.png"');
        expect(html).not.toContain('src="http://localhost/avatar.png"');
        expect(html).not.toContain('href="http://169.254.169.254/latest/meta-data"');
    });

    it('returns a quoted and RFC 5987 encoded filename header', async () => {
        getCurrentUserMock.mockResolvedValue({
            id: 105,
            username: 'filename-pdf-export-user',
            isAdmin: false,
            profileImageUrl: null,
        });
        renderHtmlToPdfOnServerMock.mockResolvedValue(Buffer.from('pdf-bytes'));

        const response = await POST(
            new NextRequest('http://localhost/api/chat/export/pdf', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Bad"\r\nX-Evil: yes',
                    messages: [],
                    participants: [],
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        );
        const contentDisposition = response.headers.get('Content-Disposition') || '';

        expect(response.status).toBe(200);
        expect(contentDisposition).toContain('filename="bad-x-evil-yes-');
        expect(contentDisposition).toContain(`filename*=UTF-8''bad-x-evil-yes-`);
        expect(contentDisposition).not.toContain('\r');
        expect(contentDisposition).not.toContain('\n');
        expect(contentDisposition).not.toContain('X-Evil:');
    });
});
