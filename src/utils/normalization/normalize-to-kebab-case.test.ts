import { normalizeToKebabCase } from '../src/normalize-to-kebab-case';

describe('how normalizing to kebab-case works', () => {
    it('will normalize one word', () => {
        expect(normalizeToKebabCase('hello')).toEqual('hello');
        expect(normalizeToKebabCase(' hello ')).toEqual('hello');
        expect(normalizeToKebabCase('HELLO')).toEqual('hello');
    });

    it('will normalize sentence', () => {
        expect(normalizeToKebabCase('hello world')).toEqual('hello-world');
        expect(normalizeToKebabCase('   hello world')).toEqual('hello-world');
        expect(normalizeToKebabCase('helloWorld')).toEqual('hello-world');
        expect(normalizeToKebabCase('hello___world')).toEqual('hello-world');
        expect(normalizeToKebabCase('hello.world')).toEqual('hello-world');
        expect(normalizeToKebabCase('hello\nworld')).toEqual('hello-world');
    });

    it('will normalize chars with diacritics', () => {
        expect(normalizeToKebabCase('hělló wórld')).toEqual('hello-world');
    });

    it('can normalize word with numbers', () => {
        expect(normalizeToKebabCase('1FooBar2')).toEqual('1foo-bar2');
    });
});
