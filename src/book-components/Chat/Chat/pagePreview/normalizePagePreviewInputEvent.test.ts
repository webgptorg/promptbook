import { describe, expect, it } from '@jest/globals';
import { normalizePagePreviewInputEvent } from './normalizePagePreviewInputEvent';

describe('normalizePagePreviewInputEvent', () => {
    it('rejects payloads that are not objects', () => {
        expect(normalizePagePreviewInputEvent(null)).toBeNull();
        expect(normalizePagePreviewInputEvent('move')).toBeNull();
        expect(normalizePagePreviewInputEvent(42)).toBeNull();
    });

    it('rejects unknown event types', () => {
        expect(normalizePagePreviewInputEvent({ type: 'hack', xRatio: 0.5, yRatio: 0.5 })).toBeNull();
    });

    it('normalizes pointer move events and clamps ratios', () => {
        expect(normalizePagePreviewInputEvent({ type: 'move', xRatio: 1.4, yRatio: -0.2 })).toEqual({
            type: 'move',
            xRatio: 1,
            yRatio: 0,
        });
        expect(normalizePagePreviewInputEvent({ type: 'move', xRatio: 'left', yRatio: 0.5 })).toBeNull();
    });

    it('normalizes pointer down and up events with button and click count', () => {
        expect(
            normalizePagePreviewInputEvent({ type: 'down', xRatio: 0.5, yRatio: 0.5, button: 'right', clickCount: 2 }),
        ).toEqual({ type: 'down', xRatio: 0.5, yRatio: 0.5, button: 'right', clickCount: 2 });

        expect(normalizePagePreviewInputEvent({ type: 'up', xRatio: 0.5, yRatio: 0.5 })).toEqual({
            type: 'up',
            xRatio: 0.5,
            yRatio: 0.5,
            button: 'left',
            clickCount: 1,
        });

        expect(normalizePagePreviewInputEvent({ type: 'down', xRatio: 0.5, yRatio: 0.5, button: 'laser' })).toBeNull();

        expect(
            normalizePagePreviewInputEvent({ type: 'down', xRatio: 0.5, yRatio: 0.5, clickCount: 99 }),
        ).toMatchObject({ clickCount: 3 });
    });

    it('keeps supporting the legacy click event', () => {
        expect(normalizePagePreviewInputEvent({ type: 'click', xRatio: 0.25, yRatio: 0.75 })).toEqual({
            type: 'click',
            xRatio: 0.25,
            yRatio: 0.75,
        });
    });

    it('normalizes wheel events and clamps deltas', () => {
        expect(
            normalizePagePreviewInputEvent({ type: 'wheel', xRatio: 0.5, yRatio: 0.5, deltaX: 0, deltaY: 99999 }),
        ).toEqual({ type: 'wheel', xRatio: 0.5, yRatio: 0.5, deltaX: 0, deltaY: 1600 });

        expect(normalizePagePreviewInputEvent({ type: 'wheel', xRatio: 0.5, yRatio: 0.5, deltaY: 10 })).toBeNull();
    });

    it('normalizes keyboard events and rejects control characters', () => {
        expect(normalizePagePreviewInputEvent({ type: 'keydown', key: 'Enter' })).toEqual({
            type: 'keydown',
            key: 'Enter',
        });
        expect(normalizePagePreviewInputEvent({ type: 'keyup', key: 'a' })).toEqual({ type: 'keyup', key: 'a' });
        expect(normalizePagePreviewInputEvent({ type: 'keydown', key: ' ' })).toEqual({ type: 'keydown', key: ' ' });
        expect(normalizePagePreviewInputEvent({ type: 'keydown', key: '' })).toBeNull();
        expect(normalizePagePreviewInputEvent({ type: 'keydown', key: String.fromCharCode(7) })).toBeNull();
        expect(normalizePagePreviewInputEvent({ type: 'keydown', key: 'x'.repeat(64) })).toBeNull();
    });

    it('normalizes resize events into the supported viewport bounds', () => {
        expect(normalizePagePreviewInputEvent({ type: 'resize', width: 4000, height: 100.4 })).toEqual({
            type: 'resize',
            width: 1920,
            height: 240,
        });
        expect(normalizePagePreviewInputEvent({ type: 'resize', width: 'wide', height: 100 })).toBeNull();
    });

    it('normalizes navigation events', () => {
        expect(normalizePagePreviewInputEvent({ type: 'navigate', action: 'back' })).toEqual({
            type: 'navigate',
            action: 'back',
        });
        expect(normalizePagePreviewInputEvent({ type: 'navigate', action: 'closeTab' })).toBeNull();
    });

    it('normalizes goto events and rejects non-HTTP URLs', () => {
        expect(normalizePagePreviewInputEvent({ type: 'goto', url: 'https://example.com/page' })).toEqual({
            type: 'goto',
            url: 'https://example.com/page',
        });
        expect(normalizePagePreviewInputEvent({ type: 'goto', url: 'file:///etc/passwd' })).toBeNull();
        expect(normalizePagePreviewInputEvent({ type: 'goto', url: 'not a url' })).toBeNull();
    });
});
