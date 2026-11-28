import type { Writable } from 'type-fest';
import type { UncertainNumber } from '../UncertainNumber';
import type { Usage } from '../Usage';

/**
 * Minimal usage information required to calculate worktime
 */
type PartialUsage = Pick<Usage, 'input' | 'output'> & {
    input: Pick<Usage['input'], 'wordsCount'>;
    output: Pick<Usage['output'], 'wordsCount'>;
};

/**
 * Function usageToWorktime will take usage and estimate saved worktime in hours of reading / writing
 *
 * Note: This is an estimate based of these sources:
 * - https://jecas.cz/doba-cteni
 * - https://www.originalnitonery.cz/blog/psani-vsemi-deseti-se-muzete-naucit-i-sami-doma
 *
 * @public exported from `@promptbook/core`
 */
export function usageToWorktime(usage: PartialUsage): UncertainNumber {
    const value =
        usage.input.wordsCount.value / (200 /* words per minute */ * 60) +
        usage.output.wordsCount.value / (40 /* words per minute */ * 60);

    const isUncertain = usage.input.wordsCount.isUncertain || usage.output.wordsCount.isUncertain;

    const uncertainNumber: Writable<UncertainNumber> = { value };

    if (isUncertain === true) {
        uncertainNumber.isUncertain = true;
    }

    return uncertainNumber;
}
