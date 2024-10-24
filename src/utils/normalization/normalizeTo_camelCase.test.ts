import { describe, expect, it } from '@jest/globals';
import { normalizeTo_camelCase } from './normalizeTo_camelCase';

describe('how normalizing to camelCase works', () => {
    it('can normalize one word', () => {
        expect(normalizeTo_camelCase('hello')).toEqual('hello');
        expect(normalizeTo_camelCase('HELLO')).toEqual('hello');
    });

    it('can normalize sentence', () => {
        expect(normalizeTo_camelCase('hello world')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('helloWorld')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('hello___world')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('hello_/_world')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('hello_\\_world')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('hello.world')).toEqual('helloWorld');
        expect(normalizeTo_camelCase('hello\nworld')).toEqual('helloWorld');
    });

    it('can normalize word with numbers', () => {
        expect(normalizeTo_camelCase('4STORY')).toEqual('4story');
        expect(normalizeTo_camelCase('4Story')).toEqual('4story');
        expect(normalizeTo_camelCase('Karel21')).toEqual('karel21');
    });
});
