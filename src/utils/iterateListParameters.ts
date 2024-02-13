import { string_javascript_name } from '../types/typeAliases';

/**
 * Iterates over nested for loops from 0 to i-1, j-1, k-1, ...
 * Each index add new dimension of the iteration
 *
 * @private within the library
 */
export function* iterateListParameters<TIndexes extends Record<string_javascript_name, number>>(
    indexRangeValues: TIndexes,
): Generator<TIndexes> {
    const keys = Object.keys(indexRangeValues);
    const values = keys.map((key) => indexRangeValues[key]);

    const max = values.reduce((a, b) => a! * b!, 1)!;

    for (let i = 0; i < max!; i++) {
        const result: TIndexes = {} as TIndexes;
        let rest = i;
        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];
            const value = values[j];
            (result as any)[key!] = rest % value!;
            rest = Math.floor(rest / value!);
        }
        yield result;
    }
}
