import { describe, expect, it } from '@jest/globals';
import { addUsage } from './addUsage';
import { ZERO_USAGE } from './usage-constants';
import { ZERO_VALUE } from './usage-constants';

describe('how addUsage works', () => {
    it('should create void usage with 0 items', () =>
        expect(addUsage()).toEqual({
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
        }));

    it('should add multiple ZERO_USAGE and still get ZERO_USAGE', () => {
        expect(addUsage()).toEqual(ZERO_USAGE);
        expect(addUsage(ZERO_USAGE)).toEqual(ZERO_USAGE);
        expect(addUsage(ZERO_USAGE, ZERO_USAGE)).toEqual(ZERO_USAGE);
        expect(addUsage(ZERO_USAGE, ZERO_USAGE, ZERO_USAGE)).toEqual(ZERO_USAGE);
        expect(addUsage(ZERO_USAGE, ZERO_USAGE, ZERO_USAGE, ZERO_USAGE)).toEqual(ZERO_USAGE);
        expect(addUsage(ZERO_USAGE, ZERO_USAGE, addUsage(ZERO_USAGE, ZERO_USAGE))).toEqual(ZERO_USAGE);
    });

    it('should preserve 1 item', () =>
        expect(
            addUsage({
                price: { value: 1 },
                duration: { value: 10 },
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
            duration: { value: 10 },
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
            addUsage(
                {
                    price: { value: 1 },
                    duration: { value: 5 },
                    input: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: ZERO_VALUE,
                    },
                    output: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: ZERO_VALUE,
                    },
                },
                {
                    price: { value: 2 },
                    duration: { value: 10 },
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
            duration: { value: 15 },
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
            addUsage(
                {
                    price: { value: 1 },
                    duration: { value: 5 },
                    input: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: ZERO_VALUE,
                    },
                    output: {
                        tokensCount: { value: 10 },
                        charactersCount: { value: 5 },
                        wordsCount: { value: 7 },
                        sentencesCount: { value: 3 },
                        linesCount: { value: 2 },
                        paragraphsCount: { value: 1 },
                        pagesCount: ZERO_VALUE,
                    },
                },
                {
                    price: { value: 2 },
                    duration: { value: 10 },
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
                    duration: { value: 15 },
                    input: {
                        tokensCount: { value: 5 },
                        charactersCount: { value: 2 },
                        wordsCount: { value: 3 },
                        sentencesCount: { value: 1 },
                        linesCount: { value: 1 },
                        paragraphsCount: ZERO_VALUE,
                        pagesCount: ZERO_VALUE,
                    },
                    output: {
                        tokensCount: { value: 5 },
                        charactersCount: { value: 2 },
                        wordsCount: { value: 3 },
                        sentencesCount: { value: 1 },
                        linesCount: { value: 1 },
                        paragraphsCount: ZERO_VALUE,
                        pagesCount: ZERO_VALUE,
                    },
                },
            ),
        ).toEqual({
            price: { value: 6 },
            duration: { value: 30 },
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
