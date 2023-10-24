import { describe, expect, it } from '@jest/globals';
import { removeEmojis } from './removeEmojis';

describe('removeEmojis', () => {
    it('should preserve text without emojis', () => {
        expect(removeEmojis('')).toBe('');
        expect(removeEmojis('Hello')).toBe('Hello');
        expect(removeEmojis('Hello world')).toBe('Hello world');
    });

    it('should remove one emoji', () => {
        expect(removeEmojis('💗')).toBe('');
        expect(removeEmojis('Hello 🖖')).toBe('Hello');
        expect(removeEmojis('Hello 💅 world')).toBe('Hello world');
    });

    it('should remove multiple emojis', () => {
        expect(removeEmojis('💗💙')).toBe('');
        // TODO:> expect(removeEmojis(`♥ ♦ ♠ ♣`)).toBe(``);
        expect(removeEmojis('Hello 💗💚')).toBe('Hello');
        expect(removeEmojis('Hello 💗🔰🟩 world')).toBe('Hello world');
        expect(removeEmojis('Hello 💗 🟩 world 🏡')).toBe('Hello world');
        // TODO:> expect(removeEmojis(`👸👨‍🦱👨👴👨‍🦰 Hello 💗🥗💗 world`)).toBe(`Hello world`);
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
