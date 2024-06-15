import { describe, expect, it } from '@jest/globals';
import { addPromptResultUsage } from './addPromptResultUsage';

describe('how addPromptResultUsage works', () => {
    it('should create void usage with 0 items', () =>
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

    it('should preserve 1 item', () =>
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

    it('should add 2 items', () =>
        expect(
            addPromptResultUsage(
                {
                    price: { value: 1 },
                    input: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: { value: 0 },
                    },
                    output: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: { value: 0 },
                    },
                },
                {
                    price: { value: 2 },
                    input: {
                        tokensCount: { value: 15 },
                        charactersCount: { value: 10 },
                        wordsCount: { value: 5 },
                        sentencesCount: { value: 2 },
                        linesCount: { value: 3 },
                        paragraphsCount: { value: 2 },
                        pagesCount: { value: 1 },
                    },
                    output: {
                        tokensCount: { value: 15 },
                        charactersCount: { value: 10 },
                        wordsCount: { value: 5 },
                        sentencesCount: { value: 2 },
                        linesCount: { value: 3 },
                        paragraphsCount: { value: 2 },
                        pagesCount: { value: 1 },
                    },
                },
            ),
        ).toEqual({
            price: { value: 3 },
            input: {
                tokensCount: { value: 25 },
                charactersCount: { value: 15 },
                wordsCount: { value: 12 },
                sentencesCount: { value: 5 },
                linesCount: { value: 5 },
                paragraphsCount: { value: 3 },
                pagesCount: { value: 1 },
            },
            output: {
                tokensCount: { value: 25 },
                charactersCount: { value: 15 },
                wordsCount: { value: 12 },
                sentencesCount: { value: 5 },
                linesCount: { value: 5 },
                paragraphsCount: { value: 3 },
                pagesCount: { value: 1 },
            },
        }));

    it('should add 3 items', () =>
        expect(
            addPromptResultUsage(
                {
                    price: { value: 1 },
                    input: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: { value: 0 },
                    },
                    output: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: { value: 0 },
                    },
                },
                {
                    price: { value: 2 },
                    input: {
                        tokensCount: { value: 15 },
                        charactersCount: { value: 10 },
                        wordsCount: { value: 5 },
                        sentencesCount: { value: 2 },
                        linesCount: { value: 3 },
                        paragraphsCount: { value: 2 },
                        pagesCount: { value: 1 },
                    },
                    output: {
                        tokensCount: { value: 15 },
                        charactersCount: { value: 10 },
                        wordsCount: { value: 5 },
                        sentencesCount: { value: 2 },
                        linesCount: { value: 3 },
                        paragraphsCount: { value: 2 },
                        pagesCount: { value: 1 },
                    },
                },
                {
                    price: { value: 3 },
                    input: {
                        tokensCount: { value: 5 },
                        charactersCount: { value: 2 },
                        wordsCount: { value: 3 },
                        sentencesCount: { value: 1 },
                        linesCount: { value: 1 },
                        paragraphsCount: { value: 0 },
                        pagesCount: { value: 0 },
                    },
                    output: {
                        tokensCount: { value: 5 },
                        charactersCount: { value: 2 },
                        wordsCount: { value: 3 },
                        sentencesCount: { value: 1 },
                        linesCount: { value: 1 },
                        paragraphsCount: { value: 0 },
                        pagesCount: { value: 0 },
                    },
                },
            ),
        ).toEqual({
            price: { value: 6 },
            input: {
                tokensCount: { value: 30 },
                charactersCount: { value: 17 },
                wordsCount: { value: 15 },
                sentencesCount: { value: 6 },
                linesCount: { value: 6 },
                paragraphsCount: { value: 3 },
                pagesCount: { value: 1 },
            },
            output: {
                tokensCount: { value: 30 },
                charactersCount: { value: 17 },
                wordsCount: { value: 15 },
                sentencesCount: { value: 6 },
                linesCount: { value: 6 },
                paragraphsCount: { value: 3 },
                pagesCount: { value: 1 },
            },
        }));
});
