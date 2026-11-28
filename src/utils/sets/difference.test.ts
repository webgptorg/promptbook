import { describe, expect, it } from '@jest/globals';
import { difference } from './difference';

describe('difference', () => {
    it('should return a new set with elements that are in set a but not in set b', () => {
        const setA = new Set([1, 2, 3, 4, 5]);
        const setB = new Set([3, 4, 5, 6, 7]);

        const result = difference(setA, setB);

        expect(result).toEqual(new Set([1, 2]));
    });

    it('should handle empty sets', () => {
        const setA = new Set([1, 2, 3]);
        const setB = new Set();

        const result = difference(setA, setB);

        expect(result).toEqual(new Set([1, 2, 3]));
    });

    it('should handle custom equality check', () => {
        const setA = new Set([{ id: 1 }, { id: 2 }, { id: 3 }]);
        const setB = new Set([{ id: 2 }, { id: 3 }, { id: 4 }]);

        const result = difference(setA, setB, (a, b) => a.id === b.id);

        expect(result).toEqual(new Set([{ id: 1 }]));
    });
});
describe('difference', () => {
    it('should return the difference set of two sets', () => {
        const setA = new Set([1, 2, 3, 4]);
        const setB = new Set([3, 4, 5, 6]);
        const expectedDifference = new Set([1, 2]);

        const result = difference(setA, setB);

        expect(result).toEqual(expectedDifference);
    });

    it('should use the custom equality function if provided', () => {
        const setA = new Set([{ id: 1 }, { id: 2 }, { id: 3 }]);
        const setB = new Set([{ id: 2 }, { id: 3 }, { id: 4 }]);
        const expectedDifference = new Set([{ id: 1 }]);

        const result = difference(setA, setB, (a, b) => a.id === b.id);

        expect(result).toEqual(expectedDifference);
    });
});
