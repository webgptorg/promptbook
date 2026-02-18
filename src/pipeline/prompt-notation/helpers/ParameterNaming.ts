import { REPLACING_NONCE } from '../../../constants';

/**
 * Strategy used to build placeholder names.
 *
 * @private type of ParameterNaming
 */
type ParameterNameStrategy = {
    /**
     * Builds a placeholder name for the given parameter index.
     *
     * @param index Zero-based parameter index.
     */
    buildName: (index: number) => string;
};

/**
 * Builds numeric parameter names (1, 2, ...).
 *
 * @param index Zero-based parameter index.
 * @private function of ParameterNaming
 */
function buildNumericParameterName(index: number): string {
    return `${index + 1}`;
}

/**
 * Builds alphabetic parameter names (a, b, ..., aa).
 *
 * @param index Zero-based parameter index.
 * @private function of ParameterNaming
 */
function buildAlphabeticParameterName(index: number): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    let remaining = index;

    while (remaining >= 0) {
        result = alphabet[remaining % alphabet.length] + result;
        remaining = Math.floor(remaining / alphabet.length) - 1;
    }

    return result;
}

/**
 * Converts a positive integer into a Roman numeral string.
 *
 * @param value Positive integer value.
 * @private function of ParameterNaming
 */
function toRomanNumeral(value: number): string {
    const romanTable: Array<{ symbol: string; value: number }> = [
        { symbol: 'M', value: 1000 },
        { symbol: 'CM', value: 900 },
        { symbol: 'D', value: 500 },
        { symbol: 'CD', value: 400 },
        { symbol: 'C', value: 100 },
        { symbol: 'XC', value: 90 },
        { symbol: 'L', value: 50 },
        { symbol: 'XL', value: 40 },
        { symbol: 'X', value: 10 },
        { symbol: 'IX', value: 9 },
        { symbol: 'V', value: 5 },
        { symbol: 'IV', value: 4 },
        { symbol: 'I', value: 1 },
    ];

    let remaining = Math.max(1, Math.floor(value));
    let result = '';

    for (const entry of romanTable) {
        while (remaining >= entry.value) {
            result += entry.symbol;
            remaining -= entry.value;
        }
    }

    return result;
}

/**
 * Builds Roman numeral parameter names (I, II, ...).
 *
 * @param index Zero-based parameter index.
 * @private function of ParameterNaming
 */
function buildRomanParameterName(index: number): string {
    return toRomanNumeral(index + 1);
}

/**
 * Creates a prefixed naming strategy.
 *
 * @param prefix Prefix string.
 * @param builder Base builder function.
 * @private function of ParameterNaming
 */
function buildPrefixedParameterName(prefix: string, builder: (index: number) => string): (index: number) => string {
    return (index: number) => `${prefix}${builder(index)}`;
}

/**
 * Available strategies that try to avoid placeholder conflicts.
 *
 * @private constant of ParameterNaming
 */
const PARAMETER_NAME_STRATEGIES: ParameterNameStrategy[] = [
    { buildName: buildNumericParameterName },
    { buildName: buildAlphabeticParameterName },
    { buildName: buildRomanParameterName },
    { buildName: buildPrefixedParameterName('p', buildNumericParameterName) },
    { buildName: buildPrefixedParameterName('p', buildAlphabeticParameterName) },
];

/**
 * Collects bracketed tokens from parameter values to avoid placeholder collisions.
 *
 * @param values Parameter values to scan.
 * @private function of ParameterNaming
 */
function collectBracketedParameterTokens(values: string[]): Set<string> {
    const tokens = new Set<string>();

    for (const value of values) {
        const pattern = /{(\\w+)}/g;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(value)) !== null) {
            const token = match[1];

            if (token) {
                tokens.add(token);
            }
        }
    }

    return tokens;
}

/**
 * Builds placeholder names while avoiding collisions with parameter content.
 *
 * @param values Parameter values to scan for conflicting tokens.
 * @private function of ParameterNaming
 */
function buildParameterNames(values: string[]): string[] {
    const count = values.length;

    if (count === 0) {
        return [];
    }

    const conflicts = collectBracketedParameterTokens(values);

    for (const strategy of PARAMETER_NAME_STRATEGIES) {
        const names = Array.from({ length: count }, (_, index) => strategy.buildName(index));
        const hasConflict = names.some((name) => conflicts.has(name));

        if (!hasConflict) {
            return names;
        }
    }

    return Array.from({ length: count }, (_, index) => `${REPLACING_NONCE}${index + 1}`);
}

/**
 * Provides naming utilities for prompt parameters.
 *
 * @private helper of prompt notation
 */
export const ParameterNaming = {
    buildParameterNames,
};
