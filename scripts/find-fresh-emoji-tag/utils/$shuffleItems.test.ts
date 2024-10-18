// Unit tests for: $shuffleItems

import { $shuffleItems } from './$shuffleItems';

describe('$shuffleItems() $shuffleItems method', () => {
    // Test to ensure the function returns an array of the same length
    it('should return an array of the same length as the input', () => {
        const input = [1, 2, 3, 4, 5];
        const result = $shuffleItems(...input);
        expect(result).toHaveLength(input.length);
    });

    // Test to ensure the function does not mutate the original array
    it('should not mutate the original array', () => {
        const input = [1, 2, 3, 4, 5];
        const inputCopy = [...input];
        $shuffleItems(...input);
        expect(input).toEqual(inputCopy);
    });

    // Test to ensure all original items are present in the shuffled array
    it('should contain all original items', () => {
        const input = [1, 2, 3, 4, 5];
        const result = $shuffleItems(...input);
        expect(result).toEqual(expect.arrayContaining(input));
    });

    // Test to ensure the function can handle an empty array
    it('should return an empty array when input is empty', () => {
        const input: number[] = [];
        const result = $shuffleItems(...input);
        expect(result).toEqual([]);
    });

    // Test to ensure the function can handle a single-element array
    it('should return the same single-element array', () => {
        const input = [42];
        const result = $shuffleItems(...input);
        expect(result).toEqual([42]);
    });

    // Test to ensure the function can handle an array with duplicate elements
    it('should handle arrays with duplicate elements', () => {
        const input = [1, 2, 2, 3, 3, 3];
        const result = $shuffleItems(...input);
        expect(result).toHaveLength(input.length);
        expect(result).toEqual(expect.arrayContaining(input));
    });

    // Test to ensure the function can handle arrays with different data types
    it('should handle arrays with different data types', () => {
        const input = [1, 'two', { three: 3 }, [4], null];
        const result = $shuffleItems(...input);
        expect(result).toHaveLength(input.length);
        expect(result).toEqual(expect.arrayContaining(input));
    });

    // Test to ensure the function can handle large arrays
    it('should handle large arrays', () => {
        const input = Array.from({ length: 1000 }, (_, i) => i);
        const result = $shuffleItems(...input);
        expect(result).toHaveLength(input.length);
        expect(result).toEqual(expect.arrayContaining(input));
    });
});

// End of unit tests for: $shuffleItems
