import type { PromptRunOptions } from './PromptRunOptions';
import type { PromptRunResult } from './PromptRunResult';

/**
 * Runner interface for executing prompts.
 */
export type PromptRunner = {
    name: string;
    runPrompt(options: PromptRunOptions): Promise<PromptRunResult>;
};
