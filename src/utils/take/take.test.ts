import { describe, expect, it } from '@jest/globals';
import { take } from './take';

describe('how take utility works', () => {
    function addOneToA<TObject extends { a: number }>(o: TObject): TObject {
        return { ...o, a: o.a + 1 };
    }
    function addOneToB<TObject extends { b: number }>(o: TObject): TObject {
        return { ...o, b: o.b + 1 };
    }

    it('should use take in object with one property', () => {
        expect(take({ a: 0 }).a).toBe(0);
        expect(take({ a: 0 }).then(addOneToA).a).toBe(1);
        expect(take({ a: 0 }).then(addOneToA).then(addOneToA).then(addOneToA).then(addOneToA).a).toBe(4);
    });

    it('should use take in object with multiple properties testing each value', () => {
        const { a, b } = take({ a: 0, b: 0 })
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB);
        expect({ a, b }).toEqual({ a: 4, b: 5 });
    });

    it('should use take in object with multiple properties accessing through the value property', () => {
        expect(
            take({ a: 0, b: 0 })
                .then(addOneToA)
                .then(addOneToA)
                .then(addOneToA)
                .then(addOneToA)
                .then(addOneToB)
                .then(addOneToB)
                .then(addOneToB)
                .then(addOneToB)
                .then(addOneToB).value,
        ).toEqual({ a: 4, b: 5 });
    });

    it('should use take in object with multiple properties accessing directly', () => {
        const { a, b } = take({ a: 0, b: 0 })
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB);

        expect({ a, b }).toMatchObject({ a: 4, b: 5 });
    });

    it('should use take in deep objects', () => {
        const { a, b } = take({ object: { a: 0, b: 0 } })
            .then(({ object }) => object)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToA)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB)
            .then(addOneToB);
        expect({ a, b }).toMatchObject({ a: 4, b: 5 });
    });

    /*
    TODO:
    it('should take primitives as a first value', () => {
    });
    */

    /*
    TODO:
    it('should take primitives deep in chain', () => {
    });
    */

    /*
    TODO:
    it('should do sideeffects with use', () => {
    });
    */

    /*
    TODO:
    it('should change the chain to promise chain', () => {
    });
    */

    /*
    TODO:
    it('should catch an error', () => {

        // Just stop
        // Catch and do more
    });
    */
});
