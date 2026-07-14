import { describe, expect, it, jest } from '@jest/globals';
import type { Page } from 'playwright';
import { applyPagePreviewBrowserInput } from './applyPagePreviewBrowserInput';
import type { PagePreviewBrowserSession } from './pagePreviewBrowserSessions';

/**
 * Creates one fake Playwright page recording all forwarded input.
 *
 * @returns Fake page together with its recording mocks.
 */
function createFakePage() {
    const mouse = {
        move: jest.fn(async () => undefined),
        down: jest.fn(async () => undefined),
        up: jest.fn(async () => undefined),
        click: jest.fn(async () => undefined),
        wheel: jest.fn(async () => undefined),
    };
    const keyboard = {
        down: jest.fn(async (key: string) => {
            if (key === 'č') {
                throw new Error(`Unknown key: "${key}"`);
            }
        }),
        up: jest.fn(async () => undefined),
        insertText: jest.fn(async () => undefined),
    };
    const page = {
        mouse,
        keyboard,
        isClosed: () => false,
        setViewportSize: jest.fn(async () => undefined),
        goBack: jest.fn(async () => null),
        goForward: jest.fn(async () => null),
        reload: jest.fn(async () => null),
        goto: jest.fn(async () => null),
        url: () => 'https://example.com/',
        title: async () => 'Example',
    };

    return { page: page as unknown as Page, mouse, keyboard, navigation: page };
}

/**
 * Creates one in-memory browser preview session around a fake page.
 *
 * @param page - Fake Playwright page.
 * @returns Session with a 1000x500 viewport.
 */
function createFakeSession(page: Page): PagePreviewBrowserSession {
    const now = new Date().toISOString();

    return {
        id: 'page-preview-1234567890abcdef',
        url: 'https://example.com/',
        userId: 42,
        username: 'alice',
        createdAt: now,
        startedAt: now,
        updatedAt: now,
        lastFrameAt: null,
        processId: null,
        page,
        viewport: { width: 1000, height: 500 },
        cdpSession: null,
        applyViewport: null,
    };
}

describe('applyPagePreviewBrowserInput', () => {
    it('forwards pointer moves as viewport coordinates', async () => {
        const { page, mouse } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, { type: 'move', xRatio: 0.5, yRatio: 0.5 });

        expect(mouse.move).toHaveBeenCalledWith(500, 250);
    });

    it('forwards presses and releases with button and click count', async () => {
        const { page, mouse } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, {
            type: 'down',
            xRatio: 0.1,
            yRatio: 0.2,
            button: 'right',
            clickCount: 2,
        });
        await applyPagePreviewBrowserInput(session, {
            type: 'up',
            xRatio: 0.1,
            yRatio: 0.2,
            button: 'right',
            clickCount: 2,
        });

        expect(mouse.down).toHaveBeenCalledWith({ button: 'right', clickCount: 2 });
        expect(mouse.up).toHaveBeenCalledWith({ button: 'right', clickCount: 2 });
    });

    it('forwards wheel events after positioning the pointer', async () => {
        const { page, mouse } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, {
            type: 'wheel',
            xRatio: 1,
            yRatio: 1,
            deltaX: 0,
            deltaY: 120,
        });

        // Ratios of exactly 1 stay inside the viewport bounds
        expect(mouse.move).toHaveBeenCalledWith(999, 499);
        expect(mouse.wheel).toHaveBeenCalledWith(0, 120);
    });

    it('replays known keys through the keyboard and inserts unknown printable keys as text', async () => {
        const { page, keyboard } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, { type: 'keydown', key: 'Enter' });
        expect(keyboard.down).toHaveBeenCalledWith('Enter');
        expect(keyboard.insertText).not.toHaveBeenCalled();

        await applyPagePreviewBrowserInput(session, { type: 'keydown', key: 'č' });
        expect(keyboard.insertText).toHaveBeenCalledWith('č');

        await applyPagePreviewBrowserInput(session, { type: 'keyup', key: 'Enter' });
        expect(keyboard.up).toHaveBeenCalledWith('Enter');
    });

    it('applies resizes through the session viewport applier when available', async () => {
        const { page } = createFakePage();
        const session = createFakeSession(page);
        const applyViewport = jest.fn(async () => undefined);
        session.applyViewport = applyViewport;

        await applyPagePreviewBrowserInput(session, { type: 'resize', width: 800, height: 600 });

        expect(applyViewport).toHaveBeenCalledWith({ width: 800, height: 600 });
    });

    it('starts history navigations without blocking on the page load', async () => {
        const { page, navigation } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, { type: 'navigate', action: 'back' });
        expect(navigation.goBack).toHaveBeenCalled();

        await applyPagePreviewBrowserInput(session, { type: 'navigate', action: 'reload' });
        expect(navigation.reload).toHaveBeenCalled();
    });

    it('navigates to safe URLs and rejects private ones', async () => {
        const { page, navigation } = createFakePage();
        const session = createFakeSession(page);

        await applyPagePreviewBrowserInput(session, { type: 'goto', url: 'https://example.com/other' });
        expect(navigation.goto).toHaveBeenCalledWith(
            'https://example.com/other',
            expect.objectContaining({ waitUntil: 'domcontentloaded' }),
        );

        await expect(
            applyPagePreviewBrowserInput(session, { type: 'goto', url: 'http://169.254.169.254/latest/meta-data' }),
        ).rejects.toThrow();
    });
});
