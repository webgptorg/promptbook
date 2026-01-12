import { describe, expect, it } from '@jest/globals';
import { Color } from './Color';

describe('Color.toHsl', () => {
    it(`converts primary red to HSL`, () => {
        const color = Color.from('#ff0000');
        expect(color.toHsl()).toBe('hsl(0, 100%, 50%)');
    });

    it(`converts primary green to HSL`, () => {
        const color = Color.from('#00ff00');
        expect(color.toHsl()).toBe('hsl(120, 100%, 50%)');
    });

    it(`converts primary blue to HSL`, () => {
        const color = Color.from('#0000ff');
        expect(color.toHsl()).toBe('hsl(240, 100%, 50%)');
    });

    it(`converts white to HSL`, () => {
        const color = Color.from('#ffffff');
        expect(color.toHsl()).toBe('hsl(0, 0%, 100%)');
    });

    it(`converts black to HSL`, () => {
        const color = Color.from('#000000');
        expect(color.toHsl()).toBe('hsl(0, 0%, 0%)');
    });

    it(`converts gray to HSL`, () => {
        const color = Color.from('#808080');
        expect(color.toHsl()).toBe('hsl(0, 0%, 50%)');
    });

    it(`converts custom color #009edd to HSL`, () => {
        const color = Color.from('#009edd');
        // Approximately hsl(197, 100%, 43%)
        expect(color.toHsl()).toBe('hsl(197, 100%, 43%)');
    });

    it(`roundtrips HSL string parsing and output`, () => {
        const hslInput = 'hsl(197, 100%, 43%)';
        const color = Color.fromString(hslInput);
        expect(color.toHsl()).toBe(hslInput);
    });

    it(`converts color with alpha to HSLA`, () => {
        // Create color with alpha channel using hex format with alpha (8 digits)
        const color = Color.fromValues(255, 0, 0, 128); // Red with ~50% alpha
        expect(color.toHsl()).toBe('hsla(0, 100%, 50%, 50%)');
    });

    it(`converts fully transparent color to HSLA`, () => {
        const color = Color.fromValues(0, 255, 0, 0); // Green with 0% alpha
        expect(color.toHsl()).toBe('hsla(120, 100%, 50%, 0%)');
    });
});
