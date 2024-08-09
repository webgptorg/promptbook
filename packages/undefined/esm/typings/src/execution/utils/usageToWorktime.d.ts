import type { PromptResultUsage } from '../PromptResultUsage';
import type { UncertainNumber } from '../UncertainNumber';
/**
 * Function usageToWorktime will take usage and estimate saved worktime in hours of reading / writing
 *
 * Note: This is an estimate based of theese sources:
 * - https://jecas.cz/doba-cteni
 * - https://www.originalnitonery.cz/blog/psani-vsemi-deseti-se-muzete-naucit-i-sami-doma
 *
 * @public exported from `@promptbook/core`
 */
export declare function usageToWorktime(usage: PromptResultUsage): UncertainNumber;
