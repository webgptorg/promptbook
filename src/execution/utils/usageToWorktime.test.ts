import { describe, expect, it } from '@jest/globals';
import { addUsage } from './addUsage';
import { usageToWorktime } from './usageToWorktime';

describe('how usageToWorktime works', () => {
    it('no usage should return no time', () => expect(usageToWorktime(addUsage())).toEqual({ value: 0 }));

    it('no usage should count worktime', () =>
        expect(
            usageToWorktime({
                price: { value: 1 },
                input: {
                    tokensCount: { value: 0 },
                    charactersCount: { value: 1 },
                    wordsCount: { value: 20 },
                    sentencesCount: { value: 3 },
                    linesCount: { value: 4 },
                    paragraphsCount: { value: 5 },
                    pagesCount: { value: 6 },
                },
                output: {
                    tokensCount: { value: 3000 },
                    charactersCount: { value: 1 },
                    wordsCount: { value: 20 },
                    sentencesCount: { value: 3 },
                    linesCount: { value: 4 },
                    paragraphsCount: { value: 5 },
                    pagesCount: { value: 6 },
                },
            }),
        ).toEqual({ value: 0.01 }));

    it('no usage should count uncertain worktime', () =>
        expect(
            usageToWorktime({
                price: { value: 1, isUncertain: true },
                input: {
                    tokensCount: { value: 0, isUncertain: true },
                    charactersCount: { value: 1, isUncertain: true },
                    wordsCount: { value: 3000, isUncertain: true },
                    sentencesCount: { value: 3, isUncertain: true },
                    linesCount: { value: 4, isUncertain: true },
                    paragraphsCount: { value: 5, isUncertain: true },
                    pagesCount: { value: 6, isUncertain: true },
                },
                output: {
                    tokensCount: { value: 300, isUncertain: true },
                    charactersCount: { value: 1, isUncertain: true },
                    wordsCount: { value: 80000, isUncertain: true },
                    sentencesCount: { value: 3, isUncertain: true },
                    linesCount: { value: 4, isUncertain: true },
                    paragraphsCount: { value: 5, isUncertain: true },
                    pagesCount: { value: 6, isUncertain: true },
                },
            }),
        ).toEqual({ value: 33.583333333333336, isUncertain: true }));
});
