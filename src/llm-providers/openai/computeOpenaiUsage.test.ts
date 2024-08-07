import { describe, expect, it } from '@jest/globals';
import { computeOpenaiUsage } from './computeOpenaiUsage';

describe('how computeOpenaiUsage works', () => {
    // TODO: [🐞] Test Chat and Completion models

    it('should compute a OpenAI usage of embedding model', () => {
        expect(
            computeOpenaiUsage('', '', {
                model: 'text-embedding-3-large',
                usage: {
                    prompt_tokens: 29,
                    total_tokens: 29,
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
                    value: 29,
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
                    value: 0,
                },
                wordsCount: {
                    value: 0,
                },
            },
            price: {
                value: 0.00000377,
            },
        });
    });
});
