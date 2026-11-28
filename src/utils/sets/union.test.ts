import { describe, expect, it } from '@jest/globals';
import { union } from './union';

describe('union', () => {
    it('should return a new set with elements from all input sets', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set([3, 4, 5]);
        const set3 = new Set([5, 6, 7]);

        const result = union(set1, set2, set3);

        expect(result).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    });

    it('should handle empty sets', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set();

        const result = union(set1, set2);

        expect(result).toEqual(new Set([1, 2, 3]));
    });

    it('should handle duplicate elements', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set([3, 4, 5]);
        const set3 = new Set([5, 6, 7]);

        const result = union(set1, set2, set3, set1);

        expect(result).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    });
});
