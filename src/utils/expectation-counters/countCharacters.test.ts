import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { countCharacters } from './countCharacters';

describe('countCharacters', () => {
    it('should return 0 for an empty string', () => {
        expect(countCharacters('')).toBe(0);
        expect(countCharacters('\0')).toBe(0);
        expect(countCharacters('\0\0')).toBe(0);
    });

    it('should return the correct count for a string with one character', () => {
        expect(countCharacters(' ')).toBe(1);
        expect(countCharacters('a')).toBe(1);
        expect(countCharacters('A')).toBe(1);
        expect(countCharacters('1')).toBe(1);
        expect(countCharacters('!')).toBe(1);
    });

    it('should work with emojis', () => {
        expect(countCharacters('♥')).toBe(1);
        expect(countCharacters('❤')).toBe(1);
        expect(countCharacters('💚')).toBe(1);
        expect(countCharacters('💙')).toBe(1);
        expect(countCharacters('💫')).toBe(1);
        expect(countCharacters('🌟')).toBe(1);
        expect(countCharacters('🌠')).toBe(1);
        expect(countCharacters('🌈')).toBe(1);
        expect(countCharacters('🎆')).toBe(1);
        expect(countCharacters('🎇')).toBe(1);
        expect(countCharacters('👩🏾')).toBe(1);
        expect(countCharacters('👨')).toBe(1);
        expect(countCharacters('👨🏻')).toBe(1);
        expect(countCharacters('👨‍❤️‍👨')).toBe(1);
        expect(countCharacters('❤♥')).toBe(2);
    });

    it('should work with multiple emojis', () => {
        expect(countCharacters('💚💙💫🌟🌠')).toBe(5);
        expect(countCharacters('👩🏾👨')).toBe(2);
        expect(countCharacters('👨')).toBe(1);
        expect(countCharacters('👨‍❤️‍👨👨‍❤️‍👨👨‍❤️‍👨')).toBe(3);
    });

    it('should return the correct count for a string with multiple characters', () => {
        expect(countCharacters('Hello')).toBe(5);
        expect(countCharacters('I ♥ Programming')).toBe(15);
        expect(countCharacters('I ❤ Programming')).toBe(15);
        expect(countCharacters('I 💙 Programming')).toBe(15);
        expect(countCharacters('I 💫 Programming')).toBe(15);
        expect(countCharacters('I 👩🏾 Programming')).toBe(15);
        expect(countCharacters('I 👨‍❤️‍👨 Programming')).toBe(15);
    });

    it('should return the correct count for a string with special characters', () => {
        expect(countCharacters('Hello!')).toBe(6);
    });

    it('should return the correct count for a string with whitespace characters', () => {
        expect(countCharacters('Hello world')).toBe(11);
        expect(
            countCharacters(
                spaceTrim(`
            Hello
            world
        `),
            ),
        ).toBe(11);
    });
});
