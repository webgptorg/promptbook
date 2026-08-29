import { applyCoderRunControlKey } from './applyCoderRunControlKey';
import {
    announcePauseTargetLabel,
    beginSkippableWait,
    finishSkippableWait,
    getEndAfterCurrentPromptState,
    getPauseState,
    resetCoderRunControls,
    shouldSkipCurrentWait,
} from './waitForPause';

describe('applyCoderRunControlKey', () => {
    beforeEach(() => {
        resetCoderRunControls();
    });

    afterEach(() => {
        resetCoderRunControls();
    });

    it('answers every pause toggle of the `P` control', () => {
        announcePauseTargetLabel('running verification after attempt #2');

        expect(applyCoderRunControlKey('p')).toEqual({
            controlKey: 'P',
            message: 'Pause requested, pausing before running verification after attempt #2',
            tone: 'warning',
        });
        expect(getPauseState()).toBe('PAUSING');

        expect(applyCoderRunControlKey('p')).toEqual({
            controlKey: 'P',
            message: 'Pause cancelled, the run continues',
            tone: 'success',
        });
        expect(getPauseState()).toBe('RUNNING');
    });

    it('skips an active wait with the `S` control', () => {
        const waitToken = beginSkippableWait();

        expect(applyCoderRunControlKey('s')).toEqual({
            controlKey: 'S',
            message: 'Skipping the current waiting, continuing right now',
            tone: 'success',
        });
        expect(shouldSkipCurrentWait(waitToken)).toBe(true);

        finishSkippableWait(waitToken);
    });

    it('answers the `S` control even when there is nothing to skip', () => {
        expect(applyCoderRunControlKey('s')).toEqual({
            controlKey: 'S',
            message: 'Nothing to skip, the coder is not waiting right now',
            tone: 'info',
        });
    });

    it('answers both states of the `X` control', () => {
        expect(applyCoderRunControlKey('x')).toEqual({
            controlKey: 'X',
            message: 'Ending after the current prompt finishes',
            tone: 'warning',
        });
        expect(getEndAfterCurrentPromptState()).toBe(true);

        expect(applyCoderRunControlKey('x')).toEqual({
            controlKey: 'X',
            message: 'End cancelled, the whole queue will be processed',
            tone: 'success',
        });
        expect(getEndAfterCurrentPromptState()).toBe(false);
    });

    it('ignores keys which are not bound to a control', () => {
        expect(applyCoderRunControlKey('q')).toBeUndefined();
        expect(applyCoderRunControlKey(undefined)).toBeUndefined();
        expect(getPauseState()).toBe('RUNNING');
        expect(getEndAfterCurrentPromptState()).toBe(false);
    });
});
