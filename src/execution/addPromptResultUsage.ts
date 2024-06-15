import { PromptResultUsage } from './PromptResult';

/**
 * Function addPromptResultUsage will add multiple usages into one
 *
 * Note: If you provide 0 values, it returns void usage
 */

export function addPromptResultUsage(...values: Array<PromptResultUsage>): PromptResultUsage {
    return values[0];
}
