import { describe, expect, it } from '@jest/globals';
import { intersection } from './intersection';

describe('intersection', () => {
    it('should return a new set with elements that are present in all input sets', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set([2, 3, 4]);
        const set3 = new Set([3, 4, 5]);

        const result = intersection(set1, set2, set3);

        expect(result).toEqual(new Set([3]));
    });

    it('should handle empty sets', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set();

        const result = intersection(set1, set2);

        expect(result).toEqual(new Set());
    });

    it('should handle duplicate elements', () => {
        const set1 = new Set([1, 2, 3]);
        const set2 = new Set([2, 3, 4]);
        const set3 = new Set([3, 4, 5]);

        const result = intersection(set1, set2, set3, set1);

        expect(result).toEqual(new Set([3]));
    });
});
