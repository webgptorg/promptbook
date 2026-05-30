import { describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { renderHtmlToPdfOnServer } from '@/src/utils/chatExport/renderHtmlToPdfOnServer';

jest.mock('@/src/utils/chatExport/renderHtmlToPdfOnServer', () => ({
    renderHtmlToPdfOnServer: jest.fn(),
}));

/**
 * Typed access to the mocked PDF renderer.
 */
const renderHtmlToPdfOnServerMock = renderHtmlToPdfOnServer as jest.MockedFunction<typeof renderHtmlToPdfOnServer>;

describe('POST /api/chat/export/pdf', () => {
    it('returns a downloadable PDF rendered from the standalone chat HTML export', async () => {
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
        expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="demo-chat-\d{4}-\d{2}-\d{2}\.pdf"$/);
        expect(renderHtmlToPdfOnServerMock).toHaveBeenCalledTimes(1);
        expect(renderHtmlToPdfOnServerMock.mock.calls[0]?.[0]).toContain('Demo chat');
        expect(renderHtmlToPdfOnServerMock.mock.calls[0]?.[0]).toContain('Conversation export');
        await expect(response.text()).resolves.toBe('pdf-bytes');
    });

    it('rejects malformed payloads', async () => {
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
});
