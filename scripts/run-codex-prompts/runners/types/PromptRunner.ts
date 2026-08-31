import type { PromptRunOptions } from './PromptRunOptions';
import type { PromptRunResult } from './PromptRunResult';
import type { HarnessSubscriptionUsage } from './HarnessSubscriptionUsage';

/**
 * Runner interface for executing prompts.
 */
export type PromptRunner = {
    name: string;
    runPrompt(options: PromptRunOptions): Promise<PromptRunResult>;

    /**
     * Reads the current subscription-limit snapshot when this harness can report one.
     *
     * Harnesses without subscription authentication intentionally omit this optional capability. Implementations
     * return `undefined` when no compatible subscription usage is available, so a dashboard enhancement can never
     * prevent coding work from running.
     */
    getSubscriptionUsage?(): Promise<HarnessSubscriptionUsage | undefined>;
};
