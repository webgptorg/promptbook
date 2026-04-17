import moment from 'moment';
import { buildCoderRunProgressSnapshot } from './buildCoderRunProgressSnapshot';

describe('buildCoderRunProgressSnapshot', () => {
    it('reports completion percentage and estimates for prompts in the current run only', () => {
        const snapshot = buildCoderRunProgressSnapshot(
            {
                done: 47,
                forAgent: 3,
                belowMinimumPriority: 12,
                toBeWritten: 2,
            },
            moment.duration(45, 'minutes'),
            43,
        );

        expect(snapshot).toMatchObject({
            totalPrompts: 52,
            sessionDone: 4,
            sessionRemaining: 3,
            sessionTotal: 7,
            currentPromptIndex: 5,
            skippedPrompts: 12,
            toBeWrittenPrompts: 2,
            percentage: 57,
            elapsedText: '45m',
            estimatedTotalText: '1h 18m',
            isEstimatedTotalKnown: true,
        });
    });

    it('keeps elapsed time live while estimation is still pending the first completion', () => {
        const snapshot = buildCoderRunProgressSnapshot(
            {
                done: 43,
                forAgent: 5,
                belowMinimumPriority: 9,
                toBeWritten: 1,
            },
            moment.duration(10, 'seconds'),
            43,
        );

        expect(snapshot).toMatchObject({
            sessionDone: 0,
            sessionRemaining: 5,
            sessionTotal: 5,
            currentPromptIndex: 1,
            percentage: 0,
            elapsedText: '10s',
            estimatedTotalText: 'estimating...',
            estimatedLabel: 'after first completion',
            isEstimatedTotalKnown: false,
        });
    });
});
