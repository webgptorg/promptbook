import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import type { Usage } from '../Usage';

/**
 * Represents the uncertain value
 *
 * @public exported from `@promptbook/core`
 */
export const ZERO_VALUE = $deepFreeze({ value: 0 } as const);

/**
 * Represents the uncertain value
 *
 * @public exported from `@promptbook/core`
 */
export const UNCERTAIN_ZERO_VALUE = $deepFreeze({ value: 0, isUncertain: true } as const);

/**
 * Represents the usage with no resources consumed
 *
 * @public exported from `@promptbook/core`
 */
export const ZERO_USAGE = $deepFreeze({
    price: ZERO_VALUE,
    duration: ZERO_VALUE,
    input: {
        tokensCount: ZERO_VALUE,
        charactersCount: ZERO_VALUE,
        wordsCount: ZERO_VALUE,
        sentencesCount: ZERO_VALUE,
        linesCount: ZERO_VALUE,
        paragraphsCount: ZERO_VALUE,
        pagesCount: ZERO_VALUE,
    },
    output: {
        tokensCount: ZERO_VALUE,
        charactersCount: ZERO_VALUE,
        wordsCount: ZERO_VALUE,
        sentencesCount: ZERO_VALUE,
        linesCount: ZERO_VALUE,
        paragraphsCount: ZERO_VALUE,
        pagesCount: ZERO_VALUE,
    },
} as const satisfies Usage);

/**
 * Represents the usage with unknown resources consumed
 *
 * @public exported from `@promptbook/core`
 */
export const UNCERTAIN_USAGE = $deepFreeze({
    price: UNCERTAIN_ZERO_VALUE,
    duration: UNCERTAIN_ZERO_VALUE,
    input: {
        tokensCount: UNCERTAIN_ZERO_VALUE,
        charactersCount: UNCERTAIN_ZERO_VALUE,
        wordsCount: UNCERTAIN_ZERO_VALUE,
        sentencesCount: UNCERTAIN_ZERO_VALUE,
        linesCount: UNCERTAIN_ZERO_VALUE,
        paragraphsCount: UNCERTAIN_ZERO_VALUE,
        pagesCount: UNCERTAIN_ZERO_VALUE,
    },
    output: {
        tokensCount: UNCERTAIN_ZERO_VALUE,
        charactersCount: UNCERTAIN_ZERO_VALUE,
        wordsCount: UNCERTAIN_ZERO_VALUE,
        sentencesCount: UNCERTAIN_ZERO_VALUE,
        linesCount: UNCERTAIN_ZERO_VALUE,
        paragraphsCount: UNCERTAIN_ZERO_VALUE,
        pagesCount: UNCERTAIN_ZERO_VALUE,
    },
} as const satisfies Usage);

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
