import type { PromptResultUsage } from '../PromptResultUsage';
/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export declare const ZERO_USAGE: import("type-fest/source/readonly-deep").ReadonlyObjectDeep<{
    readonly price: {
        readonly value: 0;
    };
    readonly input: {
        readonly tokensCount: {
            readonly value: 0;
        };
        readonly charactersCount: {
            readonly value: 0;
        };
        readonly wordsCount: {
            readonly value: 0;
        };
        readonly sentencesCount: {
            readonly value: 0;
        };
        readonly linesCount: {
            readonly value: 0;
        };
        readonly paragraphsCount: {
            readonly value: 0;
        };
        readonly pagesCount: {
            readonly value: 0;
        };
    };
    readonly output: {
        readonly tokensCount: {
            readonly value: 0;
        };
        readonly charactersCount: {
            readonly value: 0;
        };
        readonly wordsCount: {
            readonly value: 0;
        };
        readonly sentencesCount: {
            readonly value: 0;
        };
        readonly linesCount: {
            readonly value: 0;
        };
        readonly paragraphsCount: {
            readonly value: 0;
        };
        readonly pagesCount: {
            readonly value: 0;
        };
    };
}>;
/**
 * Function `addUsage` will add multiple usages into one
 *
 * Note: If you provide 0 values, it returns ZERO_USAGE
 *
 * @public exported from `@promptbook/core`
 */
export declare function addUsage(...usageItems: Array<PromptResultUsage>): PromptResultUsage;
