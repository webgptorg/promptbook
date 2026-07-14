/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LiveBrowserPreview } from './LiveBrowserPreview';

// jsdom has no `PointerEvent`, so pointer coordinates would be lost — a MouseEvent-backed
// stand-in keeps `clientX`/`clientY`/`button` on the fired pointer events
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
    class FakePointerEvent extends MouseEvent {
        public readonly pointerId: number;

        public constructor(type: string, eventInit: MouseEventInit & { pointerId?: number } = {}) {
            super(type, eventInit);
            this.pointerId = eventInit.pointerId ?? 1;
        }
    }

    (window as unknown as { PointerEvent: typeof FakePointerEvent }).PointerEvent = FakePointerEvent;
}

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
 * Installs a fetch mock recording all requests and answering them generically.
 *
 * @returns Fetch mock.
 */
function mockPreviewFetch(): jest.MockedFunction<typeof fetch> {
    const fetchMock = jest.fn(async () => {
        return {
            status: 200,
            json: async () => ({ ok: true }),
        } as Response;
    }) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;
    return fetchMock;
}

/**
 * Collects the JSON bodies of all input-route calls recorded by the fetch mock.
 *
 * @param fetchMock - Installed fetch mock.
 * @returns Parsed input payloads in call order.
 */
function readInputPayloads(fetchMock: jest.MockedFunction<typeof fetch>): Array<Record<string, unknown>> {
    return fetchMock.mock.calls
        .filter((call) => call[0] === '/api/page-preview/input')
        .map((call) => JSON.parse(String((call[1] as RequestInit)?.body)));
}

describe('LiveBrowserPreview', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('opens the stream with a session id and viewport size', async () => {
        mockPreviewFetch();

        render(<LiveBrowserPreview src="https://example.com/blocked" title="Blocked source" />);

        const image = await screen.findByAltText('Live browser preview of Blocked source');
        const streamUrl = new URL(image.getAttribute('src') || '', 'https://agents.example');

        expect(streamUrl.pathname).toBe('/api/page-preview/stream');
        expect(streamUrl.searchParams.get('url')).toBe('https://example.com/blocked');
        expect(streamUrl.searchParams.get('sessionId')).toMatch(/^page-preview-[a-z0-9-]{16,80}$/);
        // jsdom reports a zero-sized preview area, so the default viewport is used
        expect(streamUrl.searchParams.get('width')).toBe('1280');
        expect(streamUrl.searchParams.get('height')).toBe('800');
    });

    it('forwards presses and releases with growing click counts for double-clicks', async () => {
        const fetchMock = mockPreviewFetch();

        render(<LiveBrowserPreview src="https://example.com/blocked" title="Blocked source" />);
        const image = await screen.findByAltText('Live browser preview of Blocked source');
        jest.spyOn(image, 'getBoundingClientRect').mockReturnValue(createPreviewRect());

        fireEvent.pointerDown(image, { clientX: 60, clientY: 120, button: 0 });
        fireEvent.pointerUp(image, { clientX: 60, clientY: 120, button: 0 });
        fireEvent.pointerDown(image, { clientX: 60, clientY: 120, button: 0 });
        fireEvent.pointerUp(image, { clientX: 60, clientY: 120, button: 0 });

        await waitFor(() => {
            expect(readInputPayloads(fetchMock)).toHaveLength(4);
        });

        const [firstDown, firstUp, secondDown, secondUp] = readInputPayloads(fetchMock);
        expect(firstDown).toMatchObject({ type: 'down', xRatio: 0.5, yRatio: 0.5, button: 'left', clickCount: 1 });
        expect(firstUp).toMatchObject({ type: 'up', clickCount: 1 });
        expect(secondDown).toMatchObject({ type: 'down', clickCount: 2 });
        expect(secondUp).toMatchObject({ type: 'up', clickCount: 2 });
    });

    it('forwards hover moves, wheel scrolling, and keyboard input', async () => {
        const fetchMock = mockPreviewFetch();

        render(<LiveBrowserPreview src="https://example.com/blocked" title="Blocked source" />);
        const image = await screen.findByAltText('Live browser preview of Blocked source');
        jest.spyOn(image, 'getBoundingClientRect').mockReturnValue(createPreviewRect());

        fireEvent.pointerMove(image, { clientX: 35, clientY: 70 });
        fireEvent.wheel(image, { clientX: 60, clientY: 120, deltaX: 0, deltaY: 120 });

        const streamArea = screen.getByRole('application', {
            name: 'Interactive live browser preview of Blocked source',
        });
        fireEvent.keyDown(streamArea, { key: 'a' });
        fireEvent.keyUp(streamArea, { key: 'a' });

        await waitFor(() => {
            expect(readInputPayloads(fetchMock)).toHaveLength(4);
        });

        const [moveEvent, wheelEvent, keyDownEvent, keyUpEvent] = readInputPayloads(fetchMock);
        expect(moveEvent).toMatchObject({ type: 'move', xRatio: 0.25, yRatio: 0.25 });
        expect(wheelEvent).toMatchObject({ type: 'wheel', deltaY: 120 });
        expect(keyDownEvent).toMatchObject({ type: 'keydown', key: 'a' });
        expect(keyUpEvent).toMatchObject({ type: 'keyup', key: 'a' });
    });

    it('sends toolbar navigation and address-bar submissions', async () => {
        const fetchMock = mockPreviewFetch();

        render(<LiveBrowserPreview src="https://example.com/blocked" title="Blocked source" />);
        await screen.findByAltText('Live browser preview of Blocked source');

        fireEvent.click(screen.getByLabelText('Reload page'));

        const addressInput = screen.getByLabelText('Browser address');
        fireEvent.change(addressInput, { target: { value: 'example.org/docs' } });
        fireEvent.submit(addressInput.closest('form')!);

        await waitFor(() => {
            expect(readInputPayloads(fetchMock)).toHaveLength(2);
        });

        const [navigateEvent, gotoEvent] = readInputPayloads(fetchMock);
        expect(navigateEvent).toMatchObject({ type: 'navigate', action: 'reload' });
        expect(gotoEvent).toMatchObject({ type: 'goto', url: 'https://example.org/docs' });
    });
});
