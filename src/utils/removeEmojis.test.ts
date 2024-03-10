import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';
import { removeEmojis } from './removeEmojis';

describe('removeEmojis', () => {
    it('should preserve text without emojis', () => {
        expect(removeEmojis('')).toBe('');
        expect(removeEmojis('Hello')).toBe('Hello');
        expect(removeEmojis('Hello World')).toBe('Hello World');
        expect(removeEmojis('Hello 1')).toBe('Hello 1');
    });

    it('should remove one emoji', () => {
        expect(removeEmojis('💗')).toBe('');
        expect(removeEmojis('🈚')).toBe('');
        expect(removeEmojis('Hello 🖖')).toBe('Hello ');
        expect(removeEmojis('Hello 💅 World')).toBe('Hello  World');
    });

    it('should remove multiple emojis', () => {
        expect(removeEmojis('💗💙')).toBe('');
        expect(removeEmojis(`♥♦♠♣`)).toBe(``);
        expect(removeEmojis('Hello 💗💚')).toBe('Hello ');
        expect(removeEmojis('Hello 💗🔰🟩 World')).toBe('Hello  World');
        expect(removeEmojis('Hello 💗 🟩 World 🏡')).toBe('Hello   World ');
        expect(removeEmojis(`👸👨‍🦱👨👴👨‍🦰 Hello 💗🥗💗 World`)).toBe(` Hello  World`);
        expect(removeEmojis('💚💙💫🌟🌠')).toBe('');
        expect(removeEmojis('👩🏾👨')).toBe('');
        expect(removeEmojis('👨')).toBe('');
        expect(removeEmojis('👨‍❤️‍👨👨‍❤️‍👨👨‍❤️‍👨')).toBe('');
        expect(removeEmojis('I ♥ Programming')).toBe('I  Programming');
        expect(removeEmojis('I ❤ Programming')).toBe('I  Programming');
        expect(removeEmojis('I 💙 Programming')).toBe('I  Programming');
        expect(removeEmojis('I 💫 Programming')).toBe('I  Programming');
        expect(removeEmojis('I 👩🏾 Programming')).toBe('I  Programming');
        expect(removeEmojis('I 👨‍❤️‍👨 Programming')).toBe('I  Programming');
    });

    it('should remove multiple emojis from multi-line text', () => {
        expect(
            spaceTrim(
                removeEmojis(`
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
});
