import { normalizeTo_snake_case } from '../src/normalizeTo_snake_case';

describe('how normalizing to snake_case works', () => {
    it('can normalize one word', () => {
        expect(normalizeTo_snake_case('hello')).toEqual('hello');
        expect(normalizeTo_snake_case('HELLO')).toEqual('hello');
    });

    it('can normalize sentence', () => {
        expect(normalizeTo_snake_case('hello world')).toEqual('hello_world');
        expect(normalizeTo_snake_case('helloWorld')).toEqual('hello_world');
        expect(normalizeTo_snake_case('hello___world')).toEqual('hello_world');
        expect(normalizeTo_snake_case('hello.world')).toEqual('hello_world');
        expect(normalizeTo_snake_case('hello\nworld')).toEqual('hello_world');
    });

    it('can normalize word with numbers', () => {
        expect(normalizeTo_snake_case('4STORY')).toEqual('4story');
        expect(normalizeTo_snake_case('4Story')).toEqual('4story');
        expect(normalizeTo_snake_case('Karel21')).toEqual('karel21');
    });
});
