import { describe, expect, it } from '@jest/globals';
import { Color } from '../Color';
import { colorHueDistance } from './colorHueDistance';

describe('colorHueDistance', () => {
    it(`is zero for same colors`, () => {
        expect(colorHueDistance(Color.from('#000000'), Color.from('#000000'))).toBe(0);
        expect(colorHueDistance(Color.from('#ffffff'), Color.from('#ffffff'))).toBe(0);
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#ff0000'))).toBe(0);
        expect(colorHueDistance(Color.from('#00ff00'), Color.from('#00ff00'))).toBe(0);
        expect(colorHueDistance(Color.from('#0000ff'), Color.from('#0000ff'))).toBe(0);
    });

    it(`is still zero for each colors of grayscale`, () => {
        expect(colorHueDistance(Color.from('#000000'), Color.from('#111111'))).toBe(0);
        expect(colorHueDistance(Color.from('#111111'), Color.from('#222222'))).toBe(0);
        expect(colorHueDistance(Color.from('#222222'), Color.from('#333333'))).toBe(0);
        expect(colorHueDistance(Color.from('#333333'), Color.from('#444444'))).toBe(0);
        expect(colorHueDistance(Color.from('#444444'), Color.from('#555555'))).toBe(0);
        expect(colorHueDistance(Color.from('#555555'), Color.from('#666666'))).toBe(0);
        expect(colorHueDistance(Color.from('#666666'), Color.from('#777777'))).toBe(0);
        expect(colorHueDistance(Color.from('#777777'), Color.from('#888888'))).toBe(0);
        expect(colorHueDistance(Color.from('#888888'), Color.from('#999999'))).toBe(0);
        expect(colorHueDistance(Color.from('#999999'), Color.from('#aaaaaa'))).toBe(0);
        expect(colorHueDistance(Color.from('#aaaaaa'), Color.from('#bbbbbb'))).toBe(0);
        expect(colorHueDistance(Color.from('#bbbbbb'), Color.from('#cccccc'))).toBe(0);
        expect(colorHueDistance(Color.from('#cccccc'), Color.from('#dddddd'))).toBe(0);
        expect(colorHueDistance(Color.from('#dddddd'), Color.from('#eeeeee'))).toBe(0);
        expect(colorHueDistance(Color.from('#eeeeee'), Color.from('#ffffff'))).toBe(0);
    });

    it(`is 180 for opposite colors`, () => {
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#00ffff'))).toBe(180);
        expect(colorHueDistance(Color.from('#00ff00'), Color.from('#ff00ff'))).toBe(180);
        expect(colorHueDistance(Color.from('#0000ff'), Color.from('#ffff00'))).toBe(180);
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#00ffff'))).toBe(180);
    });

    it(`is 60 for colors with 60 degrees hue difference`, () => {
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#ffff00'))).toBe(60);
        expect(colorHueDistance(Color.from('#ffff00'), Color.from('#00ff00'))).toBe(60);
        expect(colorHueDistance(Color.from('#00ff00'), Color.from('#00ffff'))).toBe(60);
        expect(colorHueDistance(Color.from('#00ffff'), Color.from('#0000ff'))).toBe(60);
        expect(colorHueDistance(Color.from('#0000ff'), Color.from('#ff00ff'))).toBe(60);
        expect(colorHueDistance(Color.from('#ff00ff'), Color.from('#ff0000'))).toBe(60);
    });

    it(`is 120 for colors with 120 degrees hue difference`, () => {
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#00ff00'))).toBe(120);
        expect(colorHueDistance(Color.from('#00ff00'), Color.from('#0000ff'))).toBe(120);
        expect(colorHueDistance(Color.from('#0000ff'), Color.from('#ff0000'))).toBe(120);
    });

    it(`is 30 for colors with 30 degrees hue difference`, () => {
        expect(colorHueDistance(Color.from('#ff0000'), Color.from('#ff8000'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#ff8000'), Color.from('#ffff00'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#ffff00'), Color.from('#80ff00'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#80ff00'), Color.from('#00ff00'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#00ff00'), Color.from('#00ff80'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#00ff80'), Color.from('#00ffff'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#00ffff'), Color.from('#0080ff'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#0080ff'), Color.from('#0000ff'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#0000ff'), Color.from('#8000ff'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#8000ff'), Color.from('#ff00ff'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#ff00ff'), Color.from('#ff0080'))).toBeCloseTo(30, -1);
        expect(colorHueDistance(Color.from('#ff0080'), Color.from('#ff0000'))).toBeCloseTo(30, -1);
    });
});
