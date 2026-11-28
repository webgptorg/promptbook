import { describe, expect, it } from '@jest/globals';
import { Color } from './Color';

describe('how Color object works', () => {
    it('can create colors from misc formats', () => {
        expect(Color.from('#ffffff').toHex()).toBe('#ffffff');
        expect(Color.from('#FFFFFF').toHex()).toBe('#ffffff');
        expect(Color.from('#fff').toHex()).toBe('#f0f0f0'); // <- TODO: Should be #ffffff
        expect(Color.from('#ffffffff').toHex()).toBe('#ffffff');
    });

    it('can create colors from multiple colors', () => {
        expect(Color.from('#00ff00 #ff0000').toHex()).toBe('#00ff00');
    });

    // TODO: Write more tests for Color class
});
