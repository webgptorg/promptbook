import { describe, expect, it } from '@jest/globals';
import { parseKeywordsFromString } from './parseKeywordsFromString';

describe('how parsing of keywords from string works', () => {
    it('can parse keywords from strings', () => {
        expect(parseKeywordsFromString('foo')).toEqual(new Set(['foo']));
        expect(parseKeywordsFromString('foo bar')).toEqual(new Set(['foo', 'bar']));
    });

    it('will make keywords lowercase', () => {
        expect(parseKeywordsFromString('ĚSČŘŽYÁÍÉUU')).toEqual(new Set(['escrzyaieuu']));
        expect(parseKeywordsFromString('ěsčřžyáíéuu')).toEqual(new Set(['escrzyaieuu']));
    });
    it('can parse keywords with complex whitespacing', () => {
        expect(parseKeywordsFromString('    foo    bar')).toEqual(new Set(['foo', 'bar']));
        expect(
            parseKeywordsFromString(`    foo
       bar



      `),
        ).toEqual(new Set(['foo', 'bar']));
    });

    it('will strip diacritics from the keywords', () => {
        expect(parseKeywordsFromString('ěščřžýáíéúů')).toEqual(new Set(['escrzyaieuu']));
    });

    it('will strip interpunction from the keywords', () => {
        expect(parseKeywordsFromString('---aaá+++')).toEqual(new Set(['aaa']));
    });
    it('will take interpunction as a separator', () => {
        expect(parseKeywordsFromString('---aaá+++úůu:h')).toEqual(new Set(['aaa', 'uuu', 'h']));
    });

    it('will split camelČaseWords with diacritics', () => {
        expect(parseKeywordsFromString('PavolHejný')).toEqual(
            new Set([
                'pavol',
                'hejny',
                // TODO: [0] Maybe also> 'pavolhejny',
            ]),
        );
    });

    it('will split camelCaseWords', () => {
        expect(parseKeywordsFromString('FOO_BAR_HELLO')).toEqual(
            new Set([
                'foo',
                'bar',
                'hello',
                // [0]
            ]),
        );
    });

    it('will split SCREAMING_CASE_WORDS', () => {
        expect(parseKeywordsFromString('FOO_BAR_HELLO')).toEqual(
            new Set([
                'foo',
                'bar',
                'hello',
                // [0]
            ]),
        );
    });

    it('can parse keywords from strings with special chars', () => {
        expect(parseKeywordsFromString('foo:')).toEqual(new Set(['foo']));
        expect(parseKeywordsFromString('foo->bar')).toEqual(new Set(['foo', 'bar']));
        expect(parseKeywordsFromString('foo: bar**hello--?WORLD')).toEqual(new Set(['foo', 'bar', 'hello', 'world']));
    });

    it('will return only unique keywords', () => {
        expect(parseKeywordsFromString('a a a a a a a a a a a a a a a a a a a')).toEqual(new Set(['a']));
        expect(parseKeywordsFromString('a b a a a a a b a a a a a a a a a a a a a')).toEqual(new Set(['a', 'b']));
    });
});
