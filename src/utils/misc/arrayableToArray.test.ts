import { arrayableToArray } from './arrayableToArray';

describe('how arrayableToArray works', () => {
    it('will create array from nothing', () => {
        expect(arrayableToArray(undefined)).toEqual([]);
        expect(arrayableToArray()).toEqual([]);
        expect(arrayableToArray([])).toEqual([]);
    });

    it('will create array from one item', () => {
        expect(arrayableToArray(1)).toEqual([1]);
        expect(arrayableToArray(null)).toEqual([null]);
        expect(arrayableToArray([undefined])).toEqual([undefined]);
        expect(arrayableToArray('a')).toEqual(['a']);
        expect(arrayableToArray([1])).toEqual([1]);
        expect(arrayableToArray(['a'])).toEqual(['a']);
        expect(arrayableToArray({ a: 1 })).toEqual([{ a: 1 }]);
        expect(arrayableToArray([{ a: 1 }])).toEqual([{ a: 1 }]);
    });

    it('will create array from multiple items', () => {
        expect(arrayableToArray([])).toEqual([]);
        expect(arrayableToArray([[]])).toEqual([[]]);
        expect(arrayableToArray([1, 2, 3])).toEqual([1, 2, 3]);
        expect(arrayableToArray(['a', 2, 3])).toEqual(['a', 2, 3]);
    });
});
