import type { Usage } from '../../../../src/execution/Usage';

/**
 * Result returned from running a prompt.
 */
export type PromptRunResult = {
    usage: Usage;
};
