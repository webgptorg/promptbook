import type { PromptResultUsage } from '../PromptResult';
import type { UncertainNumber } from '../PromptResult';

/**
 * Function usageToWorktime will take usage and estimate saved worktime in hours of reading / writing
 *
 * Note: This is an estimate based of theese sources:
 * - https://jecas.cz/doba-cteni
 * - https://www.originalnitonery.cz/blog/psani-vsemi-deseti-se-muzete-naucit-i-sami-doma
 */

export function usageToWorktime(usage: PromptResultUsage): UncertainNumber {
    const value =
        usage.input.wordsCount.value / (200 /* words per minute */ * 60) +
        usage.output.wordsCount.value / (40 /* words per minute */ * 60);

    const isUncertain = usage.input.wordsCount.isUncertain || usage.output.wordsCount.isUncertain;

    const uncertainNumber: UncertainNumber = { value };

    if (isUncertain === true) {
        uncertainNumber.isUncertain = true;
    }

    return uncertainNumber;
}
