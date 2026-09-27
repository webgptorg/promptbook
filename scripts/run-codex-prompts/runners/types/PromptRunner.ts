import type { PromptRunOptions } from './PromptRunOptions';
import type { PromptRunResult } from './PromptRunResult';
import type { HarnessSubscriptionUsage } from './HarnessSubscriptionUsage';

/**
 * Runner interface for executing prompts.
 */
export type PromptRunner = {
    name: string;
    /** Explicit adapter contract: the harness can execute a scoped Node command and consume its stdout as a tool result. */
    readonly teamCapability?: 'command-tools';
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
