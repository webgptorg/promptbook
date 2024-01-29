/**
 * Function parseNumber will parse number from string
 *
 * Unlike Number.parseInt, Number.parseFloat it will never ever result in NaN
 * Note: it also works only with decimal numbers
 */
export function parseNumber(value: string | number): number {
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
        const [numerator, denominator] = value.split('/');
        return parseNumber(numerator!) / parseNumber(denominator!);
    }

    if (value.includes('E')) {
        const [significand, exponent] = value.split('E');
        return parseNumber(significand!) * 10 ** parseNumber(exponent!);
    }

    let num = parseFloat(value);

    if (isNaN(num)) {
        return 0;
    }

    return num;
}

/**
 * TODO: Maybe use sth. like safe-eval in fraction/calculation case @see https://www.npmjs.com/package/safe-eval
 */
