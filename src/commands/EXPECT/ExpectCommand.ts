import type { ExpectationAmount, ExpectationUnit } from '../../types/PipelineJson/Expectations';

/**
 * Expect amount command describes the desired output of the prompt template (after post-processing)
 * It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs,...
 *
 * Note: LLMs work with tokens, not characters, but in Promptbooks we want to use some human-recognisable and cross-model interoperable units.
 */
export type ExpectCommand = {
    readonly type: 'EXPECT';
    readonly sign: 'EXACTLY' | 'MINIMUM' | 'MAXIMUM';
    readonly unit: ExpectationUnit;
    readonly amount: ExpectationAmount;
};

/**
 * TODO: [🍋] Allow to `EXPECT` relative amounts like `EXPECT MAX 130% {foo} Words`
 */
