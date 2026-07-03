/** @jest-environment jsdom */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CitationIframePreview } from './CitationIframePreview';

/**
 * Creates a minimal DOMRect-like object for preview input tests.
 *
 * @returns DOMRect-compatible shape.
 */
function createPreviewRect(): DOMRect {
    return {
        bottom: 220,
        height: 200,
        left: 10,
        right: 110,
        top: 20,
        width: 100,
        x: 10,
        y: 20,
        toJSON: () => ({}),
    } as DOMRect;
}

/**
 * Installs a fetch mock that answers the embed check with the given result.
 *
 * @param canEmbed - Whether the preview URL can be embedded directly.
 * @returns Fetch mock.
 */
function mockEmbedCheck(canEmbed: boolean): jest.MockedFunction<typeof fetch> {
    const fetchMock = jest.fn(async () => {
        return {
            json: async () => ({ canEmbed }),
        } as Response;
    }) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;
    return fetchMock;
}

describe('CitationIframePreview', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders a direct iframe when the target allows embedding', async () => {
        mockEmbedCheck(true);

        render(<CitationIframePreview src="https://example.com/source" title="Example source" />);

        const frame = await screen.findByTitle('Example source');
        expect(frame.tagName).toBe('IFRAME');
        expect(frame.getAttribute('src')).toBe('https://example.com/source');
    });

    it('uses a live browser stream and forwards pointer input when embedding is blocked', async () => {
        const fetchMock = mockEmbedCheck(false);

        render(<CitationIframePreview src="https://example.com/blocked" title="Blocked source" />);

        const image = await screen.findByAltText('Live browser preview of Blocked source');
        const imageSource = image.getAttribute('src') || '';
        const streamUrl = new URL(imageSource, 'https://agents.example');
        const sessionId = streamUrl.searchParams.get('sessionId');

        expect(streamUrl.pathname).toBe('/api/page-preview/stream');
        expect(streamUrl.searchParams.get('url')).toBe('https://example.com/blocked');
        expect(sessionId).toMatch(/^page-preview-[a-z0-9-]{16,80}$/);

        jest.spyOn(image, 'getBoundingClientRect').mockReturnValue(createPreviewRect());
        fireEvent.click(image, { clientX: 60, clientY: 120 });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/page-preview/input',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    keepalive: true,
                }),
            );
        });

        const inputCall = fetchMock.mock.calls.find((call) => call[0] === '/api/page-preview/input');
        expect(inputCall).toBeDefined();

        const body = JSON.parse(String(inputCall?.[1]?.body));
        expect(body).toMatchObject({
            sessionId,
            type: 'click',
            xRatio: 0.5,
            yRatio: 0.5,
        });
    });
});
