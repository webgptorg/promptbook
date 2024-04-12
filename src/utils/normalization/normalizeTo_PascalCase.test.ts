import { normalizeTo_PascalCase } from '../src/normalizeTo_PascalCase';

describe('how normalizing to camelCase works', () => {
    it('can normalize one word', () => {
        expect(normalizeTo_PascalCase('hello')).toEqual('Hello');
        expect(normalizeTo_PascalCase('HELLO')).toEqual('Hello');
    });

    it('can normalize sentence', () => {
        expect(normalizeTo_PascalCase('hello world')).toEqual('HelloWorld');
        expect(normalizeTo_PascalCase('helloWorld')).toEqual('HelloWorld');
        expect(normalizeTo_PascalCase('hello___world')).toEqual('HelloWorld');
        expect(normalizeTo_PascalCase('hello.world')).toEqual('HelloWorld');
        expect(normalizeTo_PascalCase('hello\nworld')).toEqual('HelloWorld');
    });

    it('can normalize word with numbers', () => {
        expect(normalizeTo_PascalCase('4STORY')).toEqual('4story');
        expect(normalizeTo_PascalCase('4Story')).toEqual('4story');
        expect(normalizeTo_PascalCase('Karel21')).toEqual('Karel21');
    });
});
