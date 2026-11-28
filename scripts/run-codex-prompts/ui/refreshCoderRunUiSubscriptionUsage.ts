import type { PromptRunner } from '../runners/types/PromptRunner';
import type { CoderRunUiState } from './CoderRunUiState';

/**
 * Refreshes optional harness subscription usage in the shared coder-run UI state.
 *
 * Subscription visibility is an enhancement, not a prerequisite for running prompts. A harness which cannot expose a
 * snapshot, or whose account endpoint is temporarily unavailable, therefore leaves the existing dashboard unchanged.
 *
 * @private internal utility of coder run UI
 */
export async function refreshCoderRunUiSubscriptionUsage(options: {
    readonly runner: PromptRunner;
    readonly uiState: CoderRunUiState | undefined;
}): Promise<void> {
    const { runner, uiState } = options;

    if (!uiState || !runner.getSubscriptionUsage) {
        return;
    }

    try {
        const subscriptionUsage = await runner.getSubscriptionUsage();

        if (subscriptionUsage) {
            uiState.setSubscriptionUsage(subscriptionUsage);
        }
    } catch {
        // A current subscription snapshot must never interrupt the coding queue.
    }
}
