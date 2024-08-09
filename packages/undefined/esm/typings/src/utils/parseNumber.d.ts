/**
 * Function parseNumber will parse number from string
 *
 * Unlike Number.parseInt, Number.parseFloat it will never ever result in NaN
 * Note: it also works only with decimal numbers
 *
 * @returns parsed number
 * @throws {ParsingError} if the value is not a number
 *
 * @public exported from `@promptbook/utils`
 */
export declare function parseNumber(value: string | number): number;
/**
 * TODO: Maybe use sth. like safe-eval in fraction/calculation case @see https://www.npmjs.com/package/safe-eval
 * TODO: [🧠][🌻] Maybe export through `@promptbook/markdown-utils` not `@promptbook/utils`
 */
