import type { TupleToUnion } from 'type-fest';
import type { number_integer } from '../typeAliases';
import type { number_positive } from '../typeAliases';

/**
 * Expect this amount of each unit in the answer
 *
 * For example 5 words, 3 sentences, 2 paragraphs, ...
 *
 * Note: Expectations are performed after all postprocessing steps
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type Expectations = Partial<
    Record<Lowercase<ExpectationUnit>, { readonly min?: ExpectationAmount; readonly max?: ExpectationAmount }>
>;

/**
 * Unit of text measurement
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type ExpectationUnit = TupleToUnion<typeof EXPECTATION_UNITS>;

/**
 * Units of text measurement
 *
 * @see https://github.com/webgptorg/promptbook/discussions/30
 * @public exported from `@promptbook/core`
 */
export const EXPECTATION_UNITS = ['CHARACTERS', 'WORDS', 'SENTENCES', 'LINES', 'PARAGRAPHS', 'PAGES'] as const;

/**
 * Amount of text measurement
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type ExpectationAmount = number_integer & (number_positive | 0);

/**
 * TODO: [💝] Unite object for expecting amount and format - remove expectFormat
 */
