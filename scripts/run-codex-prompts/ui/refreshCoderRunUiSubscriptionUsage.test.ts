import moment from 'moment';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { CoderRunUiState } from './CoderRunUiState';
import { refreshCoderRunUiSubscriptionUsage } from './refreshCoderRunUiSubscriptionUsage';

/**
 * Creates the smallest runner shape needed for subscription-usage refresh tests.
 */
function createRunner(getSubscriptionUsage?: PromptRunner['getSubscriptionUsage']): PromptRunner {
    return {
        name: 'test-harness',
        runPrompt: jest.fn(),
        getSubscriptionUsage,
    };
}

describe('refreshCoderRunUiSubscriptionUsage', () => {
    it('copies every reported harness subscription limit into the shared UI state', async () => {
        const uiState = new CoderRunUiState(moment());
        const getSubscriptionUsage = jest.fn().mockResolvedValue({
            limits: [
                { label: '5h', usedPercentage: 46 },
                { label: '7d', usedPercentage: 21 },
            ],
        });

        await refreshCoderRunUiSubscriptionUsage({
            runner: createRunner(getSubscriptionUsage),
            uiState,
        });

        expect(getSubscriptionUsage).toHaveBeenCalledTimes(1);
        expect(uiState.subscriptionUsage).toEqual({
            limits: [
                { label: '5h', usedPercentage: 46 },
                { label: '7d', usedPercentage: 21 },
            ],
        });
    });

    it('leaves the UI unchanged for a harness which has no subscription-usage capability', async () => {
        const uiState = new CoderRunUiState(moment());

        await refreshCoderRunUiSubscriptionUsage({
            runner: createRunner(),
            uiState,
        });

        expect(uiState.subscriptionUsage).toBeUndefined();
    });
});
