import type { number_integer, number_positive } from '../typeAliases';

/**
 * Expect this amount of each unit in the answer
 *
 * For example 5 words, 3 sentences, 2 paragraphs, ...
 *
 * Note: Expectations are performed after all postprocessing steps
 */
export type Expectations = Partial<
    Record<Lowercase<ExpectationUnit>, { readonly min?: ExpectationAmount; readonly max?: ExpectationAmount }>
>;

/**
 * Units of text measurement
 */
export const EXPECTATION_UNITS = ['CHARACTERS', 'WORDS', 'SENTENCES', 'LINES', 'PARAGRAPHS', 'PAGES'] as const;

/**
 * Unit of text measurement
 */
export type ExpectationUnit = typeof EXPECTATION_UNITS[number];

/**
 * Amount of text measurement
 */
export type ExpectationAmount = number_integer & (number_positive | 0);

/**
 * TODO: [💝] Unite object for expecting amount and format - remove expectFormat
 */
