import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { normalizeMessageText } from './normalizeMessageText';

describe('how normalizeMessageText works', () => {
    it('will normalize simple text', () => {
        expect(normalizeMessageText('Hello World')).toEqual('Hello World');
    });

    it('will trim whitespace', () => {
        expect(normalizeMessageText('  Hello World  ')).toEqual('Hello World');
    });

    it('will normalize multiline text', () => {
        expect(
            normalizeMessageText(
                spaceTrim(`
            Hello
            World
        `),
            ),
        ).toEqual(
            spaceTrim(`
            Hello
            World
        `),
        );
    });

    it('will normalize multiline text with indentation', () => {
        expect(
            normalizeMessageText(
                spaceTrim(`
            Hello
                World
        `),
            ),
        ).toEqual(
            spaceTrim(`
            Hello
                World
        `),
        );
    });
});
