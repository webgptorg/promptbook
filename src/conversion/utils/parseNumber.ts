import { PromptbookSyntaxError } from '../../errors/PromptbookSyntaxError';

/**
 * Function parseNumber will parse number from string
 *
 * Unlike Number.parseInt, Number.parseFloat it will never ever result in NaN
 * Note: it also works only with decimal numbers
 *
 * @returns parsed number
 * @throws {PromptbookSyntaxError} if the value is not a number
 *
 * @private within the parseCommand
 */
export function parseNumber(value: string | number): number {
    const originalValue = value;

    if (typeof value === 'number') {
        value = value.toString(); // <- TODO: Maybe more efficient way to do this
    }

    if (typeof value !== 'string') {
        return 0;
    }

    value = value.trim();

    if (value.startsWith('+')) {
        return parseNumber(value.substring(1));
    }

    if (value.startsWith('-')) {
        const number = parseNumber(value.substring(1));
        if (number === 0) {
            return 0; // <- Note: To prevent -0
        }
        return -number;
    }

    value = value.replace(/,/g, '.');
    value = value.toUpperCase();

    if (value === '') {
        return 0;
    }

    if (value === '♾' || value.startsWith('INF')) {
        return Infinity;
    }

    if (value.includes('/')) {
        const [numerator_, denominator_] = value.split('/');
        const numerator = parseNumber(numerator_!);
        const denominator = parseNumber(denominator_!);

        if (denominator === 0) {
            throw new PromptbookSyntaxError(
                `Unable to parse number from "${originalValue}" because denominator is zero`,
            );
        }

        return numerator / denominator;
    }

    if (/^(NAN|NULL|NONE|UNDEFINED|ZERO|NO.*)$/.test(value)) {
        return 0;
    }

    if (value.includes('E')) {
        const [significand, exponent] = value.split('E');
        return parseNumber(significand!) * 10 ** parseNumber(exponent!);
    }

    if (!/^[0-9.]+$/.test(value) || value.split('.').length > 2) {
        throw new PromptbookSyntaxError(`Unable to parse number from "${originalValue}"`);
    }

    const num = parseFloat(value);

    if (isNaN(num)) {
        throw new PromptbookSyntaxError(`Unexpected NaN when parsing number from "${originalValue}"`);
    }

    return num;
}

/**
 * TODO: Maybe use sth. like safe-eval in fraction/calculation case @see https://www.npmjs.com/package/safe-eval
 */
