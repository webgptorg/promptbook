import { describe, expect, it } from '@jest/globals';
import { countWords } from './countWords';

describe('countWords', () => {
    it('should return 0 for an empty string', () => {
        expect(countWords('')).toBe(0);
        expect(countWords(' ')).toBe(0);
        expect(countWords('      ')).toBe(0);
        expect(countWords('  \n  \n  ')).toBe(0);
        expect(countWords('  \r\n  \r\n  ')).toBe(0);
        expect(countWords('  \n  \n  \t\t')).toBe(0);
        expect(countWords('\0')).toBe(0);
    });

    it('should return the correct count for a string with one word', () => {
        expect(countWords('Hello')).toBe(1);
        expect(countWords('World')).toBe(1);
        expect(countWords('Hello.')).toBe(1);
        expect(countWords('Hello!')).toBe(1);
        expect(countWords('Hello!' + '!' + '!' + '!' + '!' + '!')).toBe(1);
        expect(countWords('Hello!?')).toBe(1);
    });

    it('should count camelCase as multiple words', () => {
        expect(countWords('helloWorld')).toBe(2);
        expect(countWords('Hello World')).toBe(2);
        expect(countWords('Oneword')).toBe(1);
    });

    it('should count CONSTANT_CASE as multiple words', () => {
        expect(countWords('_')).toBe(0);
        expect(countWords('_HELLO')).toBe(1);
        expect(countWords('_HELLO_')).toBe(1);
        expect(countWords('__HELLO__')).toBe(1);
        expect(countWords('HELLO_WORLD')).toBe(2);
        expect(countWords('ONEWORD')).toBe(1);
    });

    it('should return the correct count for a string with multiple words', () => {
        expect(countWords('Hello World')).toBe(2);
        expect(countWords('Hello  World')).toBe(2);
        expect(countWords('Count the words')).toBe(3);
    });

    it('should work with numbers as words', () => {
        expect(countWords('I have 6 functions')).toBe(4);
        expect(countWords('My password is dsfgfwsedgt3asadsd58asd')).toBe(4);
    });

    it('should work with diacritics', () => {
        expect(countWords('My name is Pavol Hejný and I am a developer')).toBe(10);
        expect(countWords('My name is Ján Pišta and I am a developer')).toBe(10);
    });

    it('should work with cyrilic', () => {
        expect(countWords('Меня зовут Павел Хейный и я разработчик')).toBe(7);
    });

    it('should work with emojis', () => {
        expect(countWords('I ❤️ emojis')).toBe(3);
        expect(countWords('1 l⭕ve emojis')).toBe(3);
    });

    it('should ignore leading and trailing whitespace', () => {
        expect(countWords('  Hello  ')).toBe(1);
        expect(countWords('  Count the words  ')).toBe(3);
    });

    it('should handle special characters and punctuation', () => {
        expect(countWords('Hello, World!')).toBe(2);
        expect(countWords('Count the words...')).toBe(3);
        expect(countWords('Case-sensitive')).toBe(2);
        expect(countWords('Case+sensitive')).toBe(2);
        expect(countWords('Case–⁠⁠⁠⁠⁠sensitive')).toBe(2);
        expect(countWords('Case⁠⁠⁠⁠.sensitive')).toBe(2);
        expect(countWords('Case⁠⁠⁠⁠~sensitive')).toBe(2);
    });

    it('should handle newlines and tabs', () => {
        expect(countWords('Hello\nWorld')).toBe(2);
        expect(countWords('Count\tthe\twords')).toBe(3);
    });

    it('should count in JSONs', () => {
        expect(countWords('null')).toBe(1);
        expect(countWords('{"key": null}')).toBe(2);
        expect(countWords('{"key": [null    ,true,\n\n\tfalse]}')).toBe(4);
        expect(countWords('{"key-foo": "My name is Pavol"}')).toBe(6);
        expect(countWords('{"keyFoo": "My name is Pavol"}')).toBe(6);
    });

    // TODO: Implement similar logic for other formats like CSV, XML, HTML, etc., use formats logic here
});
