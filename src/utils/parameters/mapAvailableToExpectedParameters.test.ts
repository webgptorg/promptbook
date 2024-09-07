import { describe, expect, it } from '@jest/globals';
import { mapAvailableToExpectedParameters } from './mapAvailableToExpectedParameters';

describe('how `mapAvailableToExpectedParameters` works', () => {
    it('should work with supersimple empty sample', () =>
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: {},
                availableParameters: {},
            }),
        ).toEqual({}));

    it('should work with simple 1:1 match', () =>
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null },
                availableParameters: { foo: 'foo' },
            }),
        ).toEqual({ foo: 'foo' }));

    it('should work with simple N:N match', () => {
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, bar: null },
                availableParameters: { foo: 'foo', bar: 'bar' },
            }),
        ).toEqual({ foo: 'foo', bar: 'bar' });
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, bar: null, baz: null },
                availableParameters: { foo: 'foo', bar: 'bar', baz: 'baz' },
            }),
        ).toEqual({ foo: 'foo', bar: 'bar', baz: 'baz' });
    });

    it('should ignore extra available parameters', () =>
        // TODO: [🧠][🐱‍👤] There should be some option for throw error or log warning in this situation
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null },
                availableParameters: { foo: 'foo', bar: 'bar' },
            }),
        ).toEqual({ foo: 'foo' }));

    it('should throw error when parameter not available', () =>
        expect(() =>
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, bar: null },
                availableParameters: { foo: 'foo' },
            }),
        ).toThrowError(/* !!!!!! */));

    it('should match 1:1 parameters which are not matching by name BUT matching by count', () =>
        // TODO: [🧠][👩🏾‍🤝‍👩🏻] There should be option for turning on/off to match non-matching parameters by its name
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null },
                availableParameters: { bar: 'bar' },
            }),
        ).toEqual({ foo: 'bar' }));

    it('should match N:N parameters which are not matching by name BUT matching by count', () =>
        // TODO: [🧠][👩🏾‍🤝‍👩🏻] There should be option for turning on/off to match non-matching parameters by its name
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, bar: null, baz: null },
                availableParameters: { foox: 'foo', barx: 'bar', bazx: 'baz' },
            }),
        ).toEqual({ foo: 'foo', bar: 'bar', baz: 'baz' }));

    it('should match mixed situation', () => {
        // TODO: [🧠][👩🏾‍🤝‍👩🏻] There should be option for turning on/off to match non-matching parameters by its name
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, baz: null },
                availableParameters: { baz: 'baz', bar: 'bar' },
            }),
        ).toEqual({ foo: 'bar', baz: 'baz' });
        expect(
            mapAvailableToExpectedParameters({
                expectedParameters: { a: null, b: null, c: null },
                availableParameters: { aa: 'aa', b: 'b', cc: 'cc' },
            }),
        ).toEqual({ a: 'aa', b: 'b', c: 'cc' });
    });

    it('should throw error when parameters are not matching and also count is not matching', () => {
        expect(() =>
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, baz: null },
                availableParameters: { foox: 'foo', barx: 'bar', bazx: 'baz' },
            }),
        ).toThrowError(/* !!!!!! */);

        expect(() =>
            mapAvailableToExpectedParameters({
                expectedParameters: { foo: null, bar: null, baz: null },
                availableParameters: { foox: 'foo', bazx: 'baz' },
            }),
        ).toThrowError(/* !!!!!! */);
    });
});
