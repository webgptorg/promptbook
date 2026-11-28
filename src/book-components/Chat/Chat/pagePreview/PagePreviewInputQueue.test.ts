import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { PagePreviewInputQueue } from './PagePreviewInputQueue';

/**
 * One controllable in-flight fetch call recorded by the mock.
 *
 * @private test type
 */
type RecordedFetchCall = {
    readonly body: Record<string, unknown>;
    readonly resolve: () => void;
};

/**
 * Installs a fetch mock whose responses resolve only when the test releases them.
 *
 * @returns Recorded calls (with manual resolvers) backing the mock.
 */
function mockManualFetch(): Array<RecordedFetchCall> {
    const recordedCalls: Array<RecordedFetchCall> = [];

    global.fetch = jest.fn((url: unknown, init?: unknown) => {
        return new Promise<Response>((resolvePromise) => {
            recordedCalls.push({
                body: JSON.parse(String((init as RequestInit)?.body)),
                resolve: () =>
                    resolvePromise({
                        json: async () => ({ ok: true }),
                    } as Response),
            });
        });
    }) as unknown as typeof fetch;

    return recordedCalls;
}

describe('PagePreviewInputQueue', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('delivers events sequentially and in order', async () => {
        const recordedCalls = mockManualFetch();
        const queue = new PagePreviewInputQueue({ sessionId: 'page-preview-1234567890abcdef' });

        queue.send({ type: 'down', xRatio: 0.1, yRatio: 0.1, button: 'left', clickCount: 1 });
        queue.send({ type: 'up', xRatio: 0.2, yRatio: 0.2, button: 'left', clickCount: 1 });

        // Only the first event is in flight until its response arrives
        expect(recordedCalls).toHaveLength(1);
        expect(recordedCalls[0]!.body).toMatchObject({
            sessionId: 'page-preview-1234567890abcdef',
            type: 'down',
        });

        recordedCalls[0]!.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        expect(recordedCalls).toHaveLength(2);
        expect(recordedCalls[1]!.body).toMatchObject({ type: 'up' });

        recordedCalls[1]!.resolve();
        queue.dispose();
    });

    it('coalesces bursts of move events into the latest one', async () => {
        const recordedCalls = mockManualFetch();
        const queue = new PagePreviewInputQueue({ sessionId: 'page-preview-1234567890abcdef' });

        queue.send({ type: 'move', xRatio: 0.1, yRatio: 0.1 });
        queue.send({ type: 'move', xRatio: 0.2, yRatio: 0.2 });
        queue.send({ type: 'move', xRatio: 0.3, yRatio: 0.3 });

        recordedCalls[0]!.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        // The two queued moves collapsed into the latest one
        expect(recordedCalls).toHaveLength(2);
        expect(recordedCalls[1]!.body).toMatchObject({ type: 'move', xRatio: 0.3, yRatio: 0.3 });

        recordedCalls[1]!.resolve();
        queue.dispose();
    });

    it('accumulates deltas of queued wheel events', async () => {
        const recordedCalls = mockManualFetch();
        const queue = new PagePreviewInputQueue({ sessionId: 'page-preview-1234567890abcdef' });

        queue.send({ type: 'wheel', xRatio: 0.5, yRatio: 0.5, deltaX: 0, deltaY: 100 });
        queue.send({ type: 'wheel', xRatio: 0.5, yRatio: 0.5, deltaX: 5, deltaY: 100 });
        queue.send({ type: 'wheel', xRatio: 0.6, yRatio: 0.6, deltaX: 5, deltaY: 100 });

        recordedCalls[0]!.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        expect(recordedCalls).toHaveLength(2);
        expect(recordedCalls[1]!.body).toMatchObject({ type: 'wheel', deltaX: 10, deltaY: 200 });

        recordedCalls[1]!.resolve();
        queue.dispose();
    });

    it('keeps only the latest queued resize event', async () => {
        const recordedCalls = mockManualFetch();
        const queue = new PagePreviewInputQueue({ sessionId: 'page-preview-1234567890abcdef' });

        queue.send({ type: 'move', xRatio: 0.1, yRatio: 0.1 });
        queue.send({ type: 'resize', width: 800, height: 600 });
        queue.send({ type: 'resize', width: 1024, height: 768 });

        recordedCalls[0]!.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        expect(recordedCalls).toHaveLength(2);
        expect(recordedCalls[1]!.body).toMatchObject({ type: 'resize', width: 1024, height: 768 });

        recordedCalls[1]!.resolve();
        queue.dispose();
    });

    it('stops delivering after dispose', async () => {
        const recordedCalls = mockManualFetch();
        const queue = new PagePreviewInputQueue({ sessionId: 'page-preview-1234567890abcdef' });

        queue.send({ type: 'move', xRatio: 0.1, yRatio: 0.1 });
        queue.send({ type: 'move', xRatio: 0.2, yRatio: 0.2 });
        queue.dispose();

        recordedCalls[0]!.resolve();
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

        expect(recordedCalls).toHaveLength(1);

        queue.send({ type: 'move', xRatio: 0.3, yRatio: 0.3 });
        expect(recordedCalls).toHaveLength(1);
    });
});
