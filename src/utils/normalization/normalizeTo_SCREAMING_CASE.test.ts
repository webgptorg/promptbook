import { describe, expect, it } from '@jest/globals';
import { normalizeTo_SCREAMING_CASE } from './normalizeTo_SCREAMING_CASE';

describe('how normalizing to SCREAMING_CASE works', () => {
    it('can normalize one word', () => {
        expect(normalizeTo_SCREAMING_CASE('hello')).toEqual('HELLO');
        expect(normalizeTo_SCREAMING_CASE(' hello ')).toEqual('HELLO');
        expect(normalizeTo_SCREAMING_CASE('HELLO')).toEqual('HELLO');
    });

    it('can normalize sentence', () => {
        expect(normalizeTo_SCREAMING_CASE('hello world')).toEqual('HELLO_WORLD');
        expect(normalizeTo_SCREAMING_CASE('helloWorld')).toEqual('HELLO_WORLD');
        expect(normalizeTo_SCREAMING_CASE('hello___world')).toEqual('HELLO_WORLD');
        expect(normalizeTo_SCREAMING_CASE('hello.world')).toEqual('HELLO_WORLD');
        expect(normalizeTo_SCREAMING_CASE('hello\nworld')).toEqual('HELLO_WORLD');
    });

    it('can normalize word with numbers', () => {
        expect(normalizeTo_SCREAMING_CASE('4story')).toEqual('4STORY');
        expect(normalizeTo_SCREAMING_CASE('karel21')).toEqual('KAREL21');
    });
});
