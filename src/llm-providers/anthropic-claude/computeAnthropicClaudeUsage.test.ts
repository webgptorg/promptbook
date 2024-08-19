import { describe, expect, it } from '@jest/globals';
import { computeAnthropicClaudeUsage } from './computeAnthropicClaudeUsage';

describe('how computeAnthropicClaudeUsage works', () => {
    // TODO: [🐞] Test Chat and Completion models

    it('should compute a Anthropic Claude usage of embedding model', () => {
        expect(
            computeAnthropicClaudeUsage('', '', {
                model: 'claude-3-opus-20240229',
                usage: {
                    input_tokens: 7,
                    output_tokens: 3,
                },
            }),
        ).toEqual({
            input: {
                charactersCount: {
                    value: 0,
                },
                linesCount: {
                    value: 0,
                },
                pagesCount: {
                    value: 0,
                },
                paragraphsCount: {
                    value: 0,
                },
                sentencesCount: {
                    value: 0,
                },
                tokensCount: {
                    value: 7,
                },
                wordsCount: {
                    value: 0,
                },
            },
            output: {
                charactersCount: {
                    value: 0,
                },
                linesCount: {
                    value: 0,
                },
                pagesCount: {
                    value: 0,
                },
                paragraphsCount: {
                    value: 0,
                },
                sentencesCount: {
                    value: 0,
                },
                tokensCount: {
                    value: 3,
                },
                wordsCount: {
                    value: 0,
                },
            },
            price: {
                value: 0.00033,
            },
        });
    });
});

/**
 * TODO: [🤝] DRY Maybe some common abstraction between `computeOpenAiUsage` and `computeAnthropicClaudeUsage`
 */
