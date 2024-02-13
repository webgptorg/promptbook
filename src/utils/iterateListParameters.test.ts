import { describe, expect, it } from '@jest/globals';
import { iterateListParameters } from './iterateListParameters';

describe('how iterateListParameters works', () => {
    /*
    TODO:
    it('should work with empty iterations', () => {
        const iterable = iterateListParameters({});
        expect(iterable.next().value).toEqual(undefined);
    });
    */

    it('should work one iteration', () => {
        const iterable = iterateListParameters({ i: 1 });
        expect(iterable.next().value).toEqual({ i: 0 });
        expect(iterable.next().value).toEqual(undefined);
    });

    it('should work multiple one-dimensional iterations', () => {
        const iterable = iterateListParameters({ i: 3 });
        expect(iterable.next().value).toEqual({ i: 0 });
        expect(iterable.next().value).toEqual({ i: 1 });
        expect(iterable.next().value).toEqual({ i: 2 });
        expect(iterable.next().value).toEqual(undefined);
    });

    it('should work multiple two-dimensional iterations', () => {
        const iterable = iterateListParameters({ i: 3, j: 3 });
        expect(iterable.next().value).toEqual({ i: 0, j: 0 });
        expect(iterable.next().value).toEqual({ i: 1, j: 0 });
        expect(iterable.next().value).toEqual({ i: 2, j: 0 });
        expect(iterable.next().value).toEqual({ i: 0, j: 1 });
        expect(iterable.next().value).toEqual({ i: 1, j: 1 });
        expect(iterable.next().value).toEqual({ i: 2, j: 1 });
        expect(iterable.next().value).toEqual({ i: 0, j: 2 });
        expect(iterable.next().value).toEqual({ i: 1, j: 2 });
        expect(iterable.next().value).toEqual({ i: 2, j: 2 });
        expect(iterable.next().value).toEqual(undefined);
    });

    it('should work multiple multi-dimensional iterations', () => {
        const iterable = iterateListParameters({ i: 2, j: 2, k: 2 });
        expect(iterable.next().value).toEqual({ i: 0, j: 0, k: 0 });
        expect(iterable.next().value).toEqual({ i: 1, j: 0, k: 0 });
        expect(iterable.next().value).toEqual({ i: 0, j: 1, k: 0 });
        expect(iterable.next().value).toEqual({ i: 1, j: 1, k: 0 });
        expect(iterable.next().value).toEqual({ i: 0, j: 0, k: 1 });
        expect(iterable.next().value).toEqual({ i: 1, j: 0, k: 1 });
        expect(iterable.next().value).toEqual({ i: 0, j: 1, k: 1 });
        expect(iterable.next().value).toEqual({ i: 1, j: 1, k: 1 });
        expect(iterable.next().value).toEqual(undefined);
    });
});
