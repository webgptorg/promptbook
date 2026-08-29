import { requestSkipCurrentWait, resetCoderRunControls } from './waitForPause';
import { waitForSkippableWorldTimeDeadline } from './waitForSkippableWorldTimeDeadline';

describe('waitForSkippableWorldTimeDeadline', () => {
    afterEach(() => {
        resetCoderRunControls();
        jest.useRealTimers();
    });

    it('ends the wait immediately when the user skips it', async () => {
        jest.useFakeTimers({ now: 0 });

        const waitPromise = waitForSkippableWorldTimeDeadline({
            deadlineTimeMs: 600_000,
            pollIntervalMs: 30_000,
        });

        // Note: One tick lets the wait register itself as the active skippable wait
        await jest.advanceTimersByTimeAsync(0);

        expect(requestSkipCurrentWait()).toBe('REQUESTED_SKIP');

        await expect(waitPromise).resolves.toBeUndefined();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('waits until the wall-clock deadline when it is not skipped', async () => {
        jest.useFakeTimers({ now: 0 });
        const onTick = jest.fn();

        const waitPromise = waitForSkippableWorldTimeDeadline({
            deadlineTimeMs: 60_000,
            pollIntervalMs: 30_000,
            onTick,
        });

        await jest.advanceTimersByTimeAsync(60_000);

        await expect(waitPromise).resolves.toBeUndefined();
        expect(onTick).toHaveBeenCalled();
    });

    it('stops being skippable once the wait is over', async () => {
        jest.useFakeTimers({ now: 0 });

        await waitForSkippableWorldTimeDeadline({
            deadlineTimeMs: 0,
            pollIntervalMs: 30_000,
        });

        expect(requestSkipCurrentWait()).toBe('NO_ACTIVE_WAIT');
    });
});
