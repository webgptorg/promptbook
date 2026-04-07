import { describe, expect, it, jest } from '@jest/globals';
import {
    createUserChatJobHeartbeatController,
    DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
} from './createUserChatJobHeartbeatController';

/**
 * Creates one deferred promise handle for timer-driven heartbeat tests.
 *
 * @private test helper
 */
function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

describe('createUserChatJobHeartbeatController', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('does not overlap heartbeats while an earlier renewal is still running', async () => {
        const firstHeartbeat = createDeferred<{ cancelRequestedAt: string | null } | null>();
        const heartbeat = jest
            .fn<() => Promise<{ cancelRequestedAt: string | null } | null>>()
            .mockImplementation(() => firstHeartbeat.promise);
        const onCancellationRequested: () => void = jest.fn();
        const onFailureLimitReached: (error: unknown) => void = jest.fn();
        const controller = createUserChatJobHeartbeatController({
            jobId: 'job-123',
            heartbeat: () => heartbeat(),
            intervalMs: 100,
            onCancellationRequested,
            onFailureLimitReached,
        });

        jest.advanceTimersByTime(400);
        await Promise.resolve();

        expect(heartbeat).toHaveBeenCalledTimes(1);

        controller.stop();
        firstHeartbeat.resolve({ cancelRequestedAt: null });
        await controller.whenIdle();

        expect(onCancellationRequested).not.toHaveBeenCalled();
        expect(onFailureLimitReached).not.toHaveBeenCalled();
    });

    it('continues heartbeating after transient failures and aborts only after the configured failure limit', async () => {
        const transientError = new Error('Temporary heartbeat failure.');
        const permanentError = new Error('Persistent heartbeat failure.');
        const heartbeat = jest
            .fn<() => Promise<{ cancelRequestedAt: string | null } | null>>()
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce({ cancelRequestedAt: null })
            .mockRejectedValue(permanentError);
        const onHeartbeatFailure: (error: unknown, consecutiveFailures: number) => void = jest.fn();
        const onFailureLimitReached: (error: unknown) => void = jest.fn();
        const controller = createUserChatJobHeartbeatController({
            jobId: 'job-123',
            heartbeat: () => heartbeat(),
            intervalMs: 100,
            onCancellationRequested: jest.fn(),
            onHeartbeatFailure,
            onFailureLimitReached,
        });

        for (let index = 0; index < DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES + 2; index++) {
            jest.advanceTimersByTime(100);
            await Promise.resolve();
            await Promise.resolve();
        }

        await controller.whenIdle();

        expect(onHeartbeatFailure).toHaveBeenCalledWith(transientError, 1);
        expect(onHeartbeatFailure).toHaveBeenCalledWith(permanentError, 1);
        expect(onHeartbeatFailure).toHaveBeenCalledWith(permanentError, 2);
        expect(onHeartbeatFailure).toHaveBeenCalledWith(
            permanentError,
            DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
        );
        expect(onFailureLimitReached).toHaveBeenCalledTimes(1);
        expect(onFailureLimitReached).toHaveBeenCalledWith(permanentError);

        controller.stop();
    });

    it('ignores late heartbeat completions after the controller has been stopped', async () => {
        const firstHeartbeat = createDeferred<{ cancelRequestedAt: string | null } | null>();
        const onCancellationRequested: () => void = jest.fn();
        const controller = createUserChatJobHeartbeatController({
            jobId: 'job-123',
            heartbeat: () => firstHeartbeat.promise,
            intervalMs: 100,
            onCancellationRequested,
            onFailureLimitReached: jest.fn(),
        });

        jest.advanceTimersByTime(100);
        await Promise.resolve();

        controller.stop();
        firstHeartbeat.resolve(null);
        await controller.whenIdle();

        expect(onCancellationRequested).not.toHaveBeenCalled();
    });
});
