import { describe, expect, it } from '@jest/globals';
import { searchKeywords } from './searchKeywords';

describe('how searching through keywords works', () => {
    it('can search one keyword', () => {
        expect(searchKeywords(new Set(['a', 'b']), new Set(['a']))).toEqual(true);
        expect(searchKeywords(new Set(['a', 'b']), new Set(['c']))).toEqual(false);
    });

    it('can search multiple keyword', () => {
        expect(searchKeywords(new Set(['a', 'b']), new Set(['a', 'b']))).toEqual(true);
        expect(searchKeywords(new Set(['a', 'b']), new Set(['b', 'a']))).toEqual(true);
        expect(searchKeywords(new Set(['a', 'b']), new Set(['a', 'c']))).toEqual(false);
    });

    it('can search incomplete keyword', () => {
        expect(searchKeywords(new Set(['aaa', 'bbbb']), new Set(['a']))).toEqual(true);
        expect(searchKeywords(new Set(['aaa', 'bbbb']), new Set(['ab']))).toEqual(false);
    });

    /* TODO: [🌮]
    it('will take on mind amount of needles', () => {
      expect(searchKeywords(['aaa', 'abbb'], ['a','a'])).toEqual(true);
      expect(searchKeywords(['aaa', 'bbbb'], ['a','a'])).toEqual(false);
    });
  */
});
