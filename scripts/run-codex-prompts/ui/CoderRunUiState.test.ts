import moment from 'moment';
import { CoderRunUiState } from './CoderRunUiState';

describe('CoderRunUiState', () => {
    it('tracks elapsed time immediately in the rich UI so ETA becomes meaningful after the first completion', () => {
        const state = new CoderRunUiState(moment().subtract(3, 'minutes'));

        state.updateProgress({
            done: 0,
            forAgent: 5,
            belowMinimumPriority: 0,
            toBeWritten: 0,
        });
        state.updateProgress({
            done: 1,
            forAgent: 4,
            belowMinimumPriority: 0,
            toBeWritten: 0,
        });

        const progress = state.getProgress();

        expect(progress.elapsedText).not.toBe('0s');
        expect(progress.estimatedTotalText).not.toBe('0s');
        expect(progress.estimatedLabel).not.toBe('after first completion');
        expect(progress.isEstimatedTotalKnown).toBe(true);
    });

    it('returns a serializable snapshot for the coder server web UI', () => {
        const state = new CoderRunUiState(moment());

        state.setConfig({
            agentName: 'GitHub Copilot',
            priority: 2,
            serverUrl: 'http://localhost:4441',
        });
        state.setCurrentPrompt('prompts/task.md#1');
        state.setPhase('verifying');
        state.setStatusMessage('Running verification');
        state.addAgentOutput('npm test');

        expect(state.getSnapshot()).toMatchObject({
            config: {
                agentName: 'GitHub Copilot',
                priority: 2,
                serverUrl: 'http://localhost:4441',
            },
            currentPromptLabel: 'prompts/task.md#1',
            phase: 'verifying',
            statusMessage: 'Running verification',
            agentOutputLines: ['npm test'],
        });
    });
});
