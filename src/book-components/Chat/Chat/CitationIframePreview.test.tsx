/** @jest-environment jsdom */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { CitationIframePreview } from './CitationIframePreview';

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

    it('falls back to the interactive live browser preview when embedding is blocked', async () => {
        mockEmbedCheck(false);

        render(<CitationIframePreview src="https://example.com/blocked" title="Blocked source" />);

        const image = await screen.findByAltText('Live browser preview of Blocked source');
        const imageSource = image.getAttribute('src') || '';
        const streamUrl = new URL(imageSource, 'https://agents.example');

        expect(streamUrl.pathname).toBe('/api/page-preview/stream');
        expect(streamUrl.searchParams.get('url')).toBe('https://example.com/blocked');
        expect(streamUrl.searchParams.get('sessionId')).toMatch(/^page-preview-[a-z0-9-]{16,80}$/);
        expect(Number(streamUrl.searchParams.get('width'))).toBeGreaterThan(0);
        expect(Number(streamUrl.searchParams.get('height'))).toBeGreaterThan(0);

        // The remote-desktop toolbar of `<LiveBrowserPreview/>` is present
        expect(screen.getByLabelText('Browser address')).toBeDefined();
    });
});
