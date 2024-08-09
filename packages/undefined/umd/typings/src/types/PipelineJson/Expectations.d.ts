import type { number_integer } from '../typeAliases';
import type { number_positive } from '../typeAliases';
/**
 * Expect this amount of each unit in the answer
 *
 * For example 5 words, 3 sentences, 2 paragraphs, ...
 *
 * Note: Expectations are performed after all postprocessing steps
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type Expectations = Partial<Record<Lowercase<ExpectationUnit>, {
    readonly min?: ExpectationAmount;
    readonly max?: ExpectationAmount;
}>>;
/**
 * Units of text measurement
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export declare const EXPECTATION_UNITS: readonly ["CHARACTERS", "WORDS", "SENTENCES", "LINES", "PARAGRAPHS", "PAGES"];
/**
 * Unit of text measurement
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type ExpectationUnit = typeof EXPECTATION_UNITS[number];
/**
 * Amount of text measurement
 * @see https://github.com/webgptorg/promptbook/discussions/30
 */
export type ExpectationAmount = number_integer & (number_positive | 0);
/**
 * TODO: [💝] Unite object for expecting amount and format - remove expectFormat
 */
