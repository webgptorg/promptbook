import { describe, expect, it } from '@jest/globals';
import { addPromptResultUsage } from './addPromptResultUsage';

describe('how addPromptResultUsage works', () => {
    it('should creates void usage with 0 items', () =>
        expect(addPromptResultUsage()).toEqual({
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
        }));

    it('should preserves 1 item', () =>
        expect(
            addPromptResultUsage({
                price: { value: 1 },
                input: {
                    tokensCount: { value: 20 },
                    charactersCount: { value: 1 },
                    wordsCount: { value: 2 },
                    sentencesCount: { value: 3 },
                    linesCount: { value: 4 },
                    paragraphsCount: { value: 5, isUncertain: true },
                    pagesCount: { value: 6, isUncertain: true },
                },
                output: {
                    tokensCount: { value: 20 },
                    charactersCount: { value: 1 },
                    wordsCount: { value: 2 },
                    sentencesCount: { value: 3 },
                    linesCount: { value: 4 },
                    paragraphsCount: { value: 5, isUncertain: true },
                    pagesCount: { value: 6, isUncertain: true },
                },
            }),
        ).toEqual({
            price: { value: 1 },
            input: {
                tokensCount: { value: 20 },
                charactersCount: { value: 1 },
                wordsCount: { value: 2 },
                sentencesCount: { value: 3 },
                linesCount: { value: 4 },
                paragraphsCount: { value: 5, isUncertain: true },
                pagesCount: { value: 6, isUncertain: true },
            },
            output: {
                tokensCount: { value: 20 },
                charactersCount: { value: 1 },
                wordsCount: { value: 2 },
                sentencesCount: { value: 3 },
                linesCount: { value: 4 },
                paragraphsCount: { value: 5, isUncertain: true },
                pagesCount: { value: 6, isUncertain: true },
            },
        }));

    it('should adds 2 items', () =>
        expect(
            addPromptResultUsage(
                {
                    // TODO:
                },
                {
                    // TODO:
                },
            ),
        ).toEqual({
            // TODO:
        }));

    it('should adds 3 items', () =>
        expect(
            addPromptResultUsage(
                {
                    // TODO:
                },
                {
                    // TODO:
                },
            ),
        ).toEqual({
            // TODO:
        }));
});
