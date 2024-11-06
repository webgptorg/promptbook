import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { PromptResultUsage } from '../PromptResultUsage';

/**
 * Represents the usage with no resources consumed
 *
 * @public exported from `@promptbook/core`
 */
export const ZERO_USAGE = $deepFreeze({
    price: { value: 0 },
    input: {
        tokensCount: { value: 0 },
        charactersCount: { value: 0 },
        wordsCount: { value: 0 },
        sentencesCount: { value: 0 },
        linesCount: { value: 0 },
        paragraphsCount: { value: 0 },
        pagesCount: { value: 0 },
    },
    output: {
        tokensCount: { value: 0 },
        charactersCount: { value: 0 },
        wordsCount: { value: 0 },
        sentencesCount: { value: 0 },
        linesCount: { value: 0 },
        paragraphsCount: { value: 0 },
        pagesCount: { value: 0 },
    },
} as const satisfies PromptResultUsage);

/**
 * Represents the usage with unknown resources consumed
 *
 * @public exported from `@promptbook/core`
 */
export const UNCERTAIN_USAGE = $deepFreeze({
    price: { value: 0, isUncertain: true },
    input: {
        tokensCount: { value: 0, isUncertain: true },
        charactersCount: { value: 0, isUncertain: true },
        wordsCount: { value: 0, isUncertain: true },
        sentencesCount: { value: 0, isUncertain: true },
        linesCount: { value: 0, isUncertain: true },
        paragraphsCount: { value: 0, isUncertain: true },
        pagesCount: { value: 0, isUncertain: true },
    },
    output: {
        tokensCount: { value: 0, isUncertain: true },
        charactersCount: { value: 0, isUncertain: true },
        wordsCount: { value: 0, isUncertain: true },
        sentencesCount: { value: 0, isUncertain: true },
        linesCount: { value: 0, isUncertain: true },
        paragraphsCount: { value: 0, isUncertain: true },
        pagesCount: { value: 0, isUncertain: true },
    },
} as const satisfies PromptResultUsage);
