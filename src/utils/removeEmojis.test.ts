import { describe, expect, it } from '@jest/globals';
import { removeEmojis } from './removeEmojis';

describe('removeEmojis', () => {
    it('should preserve text without emojis', () => {
        expect(removeEmojis('')).toBe('');
        expect(removeEmojis('Hello')).toBe('Hello');
        expect(removeEmojis('Hello World')).toBe('Hello World');
    });

    it('should remove one emoji', () => {
        expect(removeEmojis('💗')).toBe('');
        expect(removeEmojis('🈚')).toBe('');
        expect(removeEmojis('Hello 🖖')).toBe('Hello');
        expect(removeEmojis('Hello 💅 World')).toBe('Hello World');
    });

    it('should remove multiple emojis', () => {
        expect(removeEmojis('💗💙')).toBe('');
        // TODO:> expect(removeEmojis(`♥ ♦ ♠ ♣`)).toBe(``);
        expect(removeEmojis('Hello 💗💚')).toBe('Hello');
        expect(removeEmojis('Hello 💗🔰🟩 World')).toBe('Hello World');
        // TODO:> expect(removeEmojis('Hello 💗 🟩 World 🏡')).toBe('Hello World');
        // TODO:> expect(removeEmojis(`👸👨‍🦱👨👴👨‍🦰 Hello 💗🥗💗 world`)).toBe(`Hello World`);
    });

    /*
    TODO:
    it('should remove multiple emojis from multiline text', () => {
        expect(
            removeEmojis(
                spaceTrim(`
                    🌲 Pine tree
                    🌳 Deciduous tree
                    🌴 Palm tree
                    🌱 Seedling
                    🌿 Herb
                    ☘️ Shamrock
                    🍀 Four leaf clover
                    🎍 Pine decoration
                    🎋 Tanabata tree
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Pine tree
                    Deciduous tree
                    Palm tree
                    Seedling
                    Herb
                    Shamrock
                    Four leaf clover
                    Pine decoration
                    Tanabata tree
                `),
            ),
        );
    });
    */
});
