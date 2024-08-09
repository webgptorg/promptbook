import type { PromptResultUsageCounts } from '../PromptResultUsage';
/**
 * Helper of usage compute
 *
 * @param content the content of prompt or response
 * @returns part of PromptResultUsageCounts
 *
 * @private internal util of LlmExecutionTools
 */
export declare function computeUsageCounts(content: string): Omit<PromptResultUsageCounts, 'tokensCount'>;
