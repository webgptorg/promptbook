import moment from 'moment';
import { CoderRunUiState } from './CoderRunUiState';

describe('CoderRunUiState', () => {
    it('tracks elapsed time immediately in the rich UI so ETA becomes meaningful after the first completion', () => {
        const state = new CoderRunUiState(moment().subtract(3, 'minutes'));

        state.updateProgress({
            done: 0,
            forAgent: 5,
            outsidePriorityRange: 0,
            toBeWritten: 0,
        });
        state.updateProgress({
            done: 1,
            forAgent: 4,
            outsidePriorityRange: 0,
            toBeWritten: 0,
        });

        const progress = state.getProgress();

        expect(progress.elapsedText).not.toBe('0s');
        expect(progress.estimatedTotalText).not.toBe('0s');
        expect(progress.estimatedLabel).not.toBe('after first completion');
        expect(progress.isEstimatedTotalKnown).toBe(true);
    });

    it('re-renders and counts repeats for every answered control key press', () => {
        const state = new CoderRunUiState(moment());
        const onChange = jest.fn();
        const skipFeedback = {
            controlKey: 'S',
            message: 'Nothing to skip, the coder is not waiting right now',
            tone: 'info',
        } as const;

        state.on('change', onChange);

        state.setControlFeedback(skipFeedback);
        expect(state.controlFeedback).toEqual({ ...skipFeedback, repeatCount: 1 });

        state.setControlFeedback(skipFeedback);
        expect(state.controlFeedback).toEqual({ ...skipFeedback, repeatCount: 2 });

        state.setControlFeedback({
            controlKey: 'P',
            message: 'Resuming the run',
            tone: 'success',
        });
        expect(state.controlFeedback).toMatchObject({ controlKey: 'P', repeatCount: 1 });

        state.setControlFeedback(undefined);
        expect(state.controlFeedback).toBeUndefined();

        expect(onChange).toHaveBeenCalledTimes(4);
    });

    it('uses the configured run limit for rich UI session progress', () => {
        const state = new CoderRunUiState(moment());

        state.setConfig({
            agentName: 'GitHub Copilot',
            limit: 2,
        });
        state.updateProgress({
            done: 0,
            forAgent: 9,
            outsidePriorityRange: 0,
            toBeWritten: 0,
        });

        expect(state.getProgress()).toMatchObject({
            sessionDone: 0,
            sessionRemaining: 2,
            sessionTotal: 2,
            currentPromptIndex: 1,
            percentage: 0,
        });
    });
});
