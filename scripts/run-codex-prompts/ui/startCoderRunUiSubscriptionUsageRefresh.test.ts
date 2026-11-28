import moment from 'moment';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { CoderRunUiState } from './CoderRunUiState';
import {
    CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS,
    startCoderRunUiSubscriptionUsageRefresh,
} from './startCoderRunUiSubscriptionUsageRefresh';

/**
 * Creates the smallest runner shape needed for periodic subscription-usage tests.
 */
function createRunner(getSubscriptionUsage?: PromptRunner['getSubscriptionUsage']): PromptRunner {
    return {
        name: 'test-harness',
        runPrompt: jest.fn(),
        getSubscriptionUsage,
    };
}

describe('startCoderRunUiSubscriptionUsageRefresh', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('refreshes the usage percentages every 5 seconds without waiting for the current prompt', async () => {
        const uiState = new CoderRunUiState(moment());
        let usedPercentage = 10;
        const getSubscriptionUsage = jest.fn(async () => ({
            limits: [{ label: '5h', usedPercentage: (usedPercentage += 10) }],
        }));

        const refreshHandle = startCoderRunUiSubscriptionUsageRefresh({
            runner: createRunner(getSubscriptionUsage),
            uiState,
        });

        // Note: The very first read happens right away, so the dashboard never starts with an empty usage row
        await jest.advanceTimersByTimeAsync(0);
        expect(uiState.subscriptionUsage).toEqual({ limits: [{ label: '5h', usedPercentage: 20 }] });

        await jest.advanceTimersByTimeAsync(CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);
        expect(uiState.subscriptionUsage).toEqual({ limits: [{ label: '5h', usedPercentage: 30 }] });

        await jest.advanceTimersByTimeAsync(CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);
        expect(uiState.subscriptionUsage).toEqual({ limits: [{ label: '5h', usedPercentage: 40 }] });

        refreshHandle.stop();
    });

    it('refreshes nothing after the run has stopped it', async () => {
        const uiState = new CoderRunUiState(moment());
        const getSubscriptionUsage = jest.fn(async () => ({ limits: [{ label: '5h', usedPercentage: 12 }] }));

        const refreshHandle = startCoderRunUiSubscriptionUsageRefresh({
            runner: createRunner(getSubscriptionUsage),
            uiState,
        });

        await jest.advanceTimersByTimeAsync(0);
        refreshHandle.stop();
        await jest.advanceTimersByTimeAsync(10 * CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);

        expect(getSubscriptionUsage).toHaveBeenCalledTimes(1);
    });

    it('skips a tick while the previous read of a slow harness is still in flight', async () => {
        const uiState = new CoderRunUiState(moment());
        let resolveSubscriptionUsage: (() => void) | undefined;
        const getSubscriptionUsage = jest.fn(
            async () =>
                await new Promise<undefined>((resolve) => {
                    resolveSubscriptionUsage = () => resolve(undefined);
                }),
        );

        const refreshHandle = startCoderRunUiSubscriptionUsageRefresh({
            runner: createRunner(getSubscriptionUsage),
            uiState,
        });

        await jest.advanceTimersByTimeAsync(3 * CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);
        expect(getSubscriptionUsage).toHaveBeenCalledTimes(1);

        resolveSubscriptionUsage?.();
        await jest.advanceTimersByTimeAsync(CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);
        expect(getSubscriptionUsage).toHaveBeenCalledTimes(2);

        refreshHandle.stop();
    });

    it('starts no timer for a harness which cannot report subscription usage', async () => {
        const uiState = new CoderRunUiState(moment());

        const refreshHandle = startCoderRunUiSubscriptionUsageRefresh({
            runner: createRunner(),
            uiState,
        });

        await jest.advanceTimersByTimeAsync(10 * CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);

        expect(jest.getTimerCount()).toBe(0);
        expect(uiState.subscriptionUsage).toBeUndefined();
        refreshHandle.stop();
    });

    it('starts no timer for a run without a dashboard', async () => {
        const getSubscriptionUsage = jest.fn(async () => ({ limits: [{ label: '5h', usedPercentage: 12 }] }));

        const refreshHandle = startCoderRunUiSubscriptionUsageRefresh({
            runner: createRunner(getSubscriptionUsage),
            uiState: undefined,
        });

        await jest.advanceTimersByTimeAsync(10 * CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS);

        expect(jest.getTimerCount()).toBe(0);
        expect(getSubscriptionUsage).not.toHaveBeenCalled();
        refreshHandle.stop();
    });
});
