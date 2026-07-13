import type { CoderRunUiHandle } from '../ui/renderCoderRunUi';
import { sleepWithCountdown } from './sleepWithCountdown';
import { waitUntilWorldTimeDeadline } from './waitUntilWorldTimeDeadline';

describe('waitUntilWorldTimeDeadline', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('finishes after one poll when the wall-clock deadline passes while the computer is asleep', async () => {
        jest.useFakeTimers({ now: 0 });

        const waitPromise = waitUntilWorldTimeDeadline({
            deadlineTimeMs: 60_000,
            pollIntervalMs: 30_000,
        });

        jest.setSystemTime(60_000);
        await jest.advanceTimersByTimeAsync(30_000);

        await expect(waitPromise).resolves.toBeUndefined();
    });

    it('does not sleep again when a pause checkpoint consumes the remaining wait time', async () => {
        jest.useFakeTimers({ now: 0 });
        const onTick = jest.fn(async () => {
            jest.setSystemTime(60_000);
        });

        await waitUntilWorldTimeDeadline({
            deadlineTimeMs: 60_000,
            pollIntervalMs: 30_000,
            onTick,
        });

        expect(onTick).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps countdown waits tied to the original wall-clock deadline', async () => {
        jest.useFakeTimers({ now: 0 });
        const uiHandle = {
            state: {
                setStatusMessage: jest.fn(),
            },
        } as unknown as CoderRunUiHandle;

        const waitPromise = sleepWithCountdown({
            durationMs: 60_000,
            deadlineTimeMs: 60_000,
            waitKind: 'between-prompts',
            isRichUiEnabled: true,
            uiHandle,
        });

        expect(uiHandle.state.setStatusMessage).toHaveBeenCalledTimes(1);
        expect(uiHandle.state.setStatusMessage).toHaveBeenCalledWith(
            expect.stringContaining('Waiting 1m of 1m between prompts'),
        );

        jest.setSystemTime(60_000);
        await jest.advanceTimersByTimeAsync(30_000);

        await expect(waitPromise).resolves.toBeUndefined();
        expect(uiHandle.state.setStatusMessage).toHaveBeenCalledTimes(1);
    });
});
