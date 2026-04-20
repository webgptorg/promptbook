import { checkPause, getPauseState, requestResume, togglePauseState } from './waitForPause';

/**
 * Waits one event-loop turn so async pause transitions can advance.
 */
async function waitForNextTick(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('waitForPause', () => {
    beforeEach(() => {
        requestResume();
    });

    afterEach(() => {
        requestResume();
    });

    it('cancels a pending pause before the runner becomes fully paused', () => {
        expect(getPauseState()).toBe('RUNNING');
        expect(togglePauseState()).toBe('REQUESTED_PAUSE');
        expect(getPauseState()).toBe('PAUSING');
        expect(togglePauseState()).toBe('CANCELLED_PAUSE');
        expect(getPauseState()).toBe('RUNNING');
    });

    it('resumes after the runner has entered the paused state', async () => {
        const onPaused = jest.fn();
        const onResumed = jest.fn();

        expect(togglePauseState()).toBe('REQUESTED_PAUSE');

        const pausePromise = checkPause({
            silent: true,
            onPaused,
            onResumed,
        });

        await waitForNextTick();

        expect(getPauseState()).toBe('PAUSED');
        expect(onPaused).toHaveBeenCalledTimes(1);
        expect(togglePauseState()).toBe('RESUMED');

        await pausePromise;

        expect(getPauseState()).toBe('RUNNING');
        expect(onResumed).toHaveBeenCalledTimes(1);
    });
});
