import {
    announcePauseTargetLabel,
    beginSkippableWait,
    checkPause,
    finishSkippableWait,
    getEndAfterCurrentPromptState,
    getPauseState,
    getPauseTargetLabel,
    requestSkipCurrentWait,
    resetCoderRunControls,
    toggleEndAfterCurrentPromptState,
    togglePauseState,
    waitForSkippableMilliseconds,
} from './waitForPause';

/**
 * Waits one event-loop turn so async pause transitions can advance.
 */
async function waitForNextTick(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('waitForPause', () => {
    beforeEach(() => {
        resetCoderRunControls();
    });

    afterEach(() => {
        resetCoderRunControls();
        jest.useRealTimers();
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

    it('tracks and resets the active pause target label', async () => {
        expect(getPauseTargetLabel()).toBe('the next task');

        announcePauseTargetLabel('running verification after attempt #2');
        expect(getPauseTargetLabel()).toBe('running verification after attempt #2');

        expect(togglePauseState()).toBe('REQUESTED_PAUSE');
        const pausePromise = checkPause({ silent: true });

        await waitForNextTick();
        expect(getPauseState()).toBe('PAUSED');
        expect(getPauseTargetLabel()).toBe('running verification after attempt #2');

        expect(togglePauseState()).toBe('RESUMED');
        await pausePromise;

        expect(getPauseTargetLabel()).toBe('the next task');
    });

    it('toggles the dynamic end-after-current-prompt control', () => {
        expect(getEndAfterCurrentPromptState()).toBe(false);
        expect(toggleEndAfterCurrentPromptState()).toBe('REQUESTED_END');
        expect(getEndAfterCurrentPromptState()).toBe(true);
        expect(toggleEndAfterCurrentPromptState()).toBe('CANCELLED_END');
        expect(getEndAfterCurrentPromptState()).toBe(false);
    });

    it('skips only an active timed wait', async () => {
        jest.useFakeTimers();

        expect(requestSkipCurrentWait()).toBe('NO_ACTIVE_WAIT');

        const waitToken = beginSkippableWait();
        const waitPromise = waitForSkippableMilliseconds(waitToken, 60_000);

        expect(requestSkipCurrentWait()).toBe('REQUESTED_SKIP');
        await expect(waitPromise).resolves.toBeUndefined();

        finishSkippableWait(waitToken);
        expect(requestSkipCurrentWait()).toBe('NO_ACTIVE_WAIT');
        expect(jest.getTimerCount()).toBe(0);

    });
});
