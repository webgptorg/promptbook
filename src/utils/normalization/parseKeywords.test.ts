import { describe, expect, it } from '@jest/globals';
import { parseKeywords } from './parseKeywords';

describe('how parsing of keywords from objects works', () => {
    it('can parse keywords from arrays', () => {
        expect(parseKeywords(['foo'])).toEqual(new Set(['foo']));
        expect(parseKeywords(['foo bar', 'bzz'])).toEqual(new Set(['foo', 'bar', 'bzz']));
    });

    it('can parse keywords from objects', () => {
        expect(parseKeywords({ a: 'foo' })).toEqual(new Set(['foo']));
        expect(parseKeywords({ b: ['foo bar', 'bzz'] })).toEqual(new Set(['foo', 'bar', 'bzz']));
    });

    it('can parse numecic keywords', () => {
        expect(parseKeywords(['foo 123'])).toEqual(new Set(['foo', '123']));
        expect(parseKeywords(['foo 0 bar 1', 'bzz', '4story', 'hevesh5'])).toEqual(
            new Set(['foo', '0', 'bar', '1', 'bzz', '4story', 'hevesh5']),
        );
        // TODO: What about decimal and negative numbers
    });

    it('will skip numbers values', () => {
        expect(parseKeywords(['a', 1])).toEqual(new Set(['a']));
        expect(parseKeywords({ foo: 'a', bar: 1 })).toEqual(new Set(['a']));
    });

    it('will skip boolean values', () => {
        expect(parseKeywords(['a', true, false])).toEqual(new Set(['a']));
        expect(parseKeywords({ foo: 'a', bar: true })).toEqual(new Set(['a']));
    });

    it('will skip Dates', () => {
        expect(parseKeywords(['a', new Date('2020-04-13T00:00:00.000+08:00')])).toEqual(new Set(['a']));
        expect(
            parseKeywords({
                foo: 'a',
                bar: new Date('2020-04-13T00:00:00.000+08:00'),
            }),
        ).toEqual(new Set(['a']));
    });

    it('will not crash when there is null value', () => {
        expect(parseKeywords(['a', null])).toEqual(new Set(['a']));
        expect(parseKeywords({ foo: 'a', bar: null })).toEqual(new Set(['a']));
    });

    it('will not crash when there is undefined value', () => {
        expect(parseKeywords(['a', undefined])).toEqual(new Set(['a']));
        expect(parseKeywords({ foo: 'a', bar: undefined })).toEqual(new Set(['a']));
    });

    it('can parse from multiple inputs at once', () => {
        // TODO: This test is bit redundant
        expect(parseKeywords(['a', 'b', 'c'])).toEqual(new Set(['a', 'b', 'c']));
        expect(parseKeywords(['a', ['b', 'c']])).toEqual(new Set(['a', 'b', 'c']));
        expect(parseKeywords(['a', ['b', { foo: 'c' }]])).toEqual(new Set(['a', 'b', 'c']));
    });

    it('will return only unique keywords', () => {
        expect(parseKeywords(['a', ['a', { foo: 'a' }, { bar: { 1: 'a' } }]])).toEqual(new Set(['a']));
    });
});
