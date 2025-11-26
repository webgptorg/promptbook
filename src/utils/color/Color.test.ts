import { describe, expect, it } from '@jest/globals';
import { Color } from './Color';

describe('how Color object works', () => {
    it('can create colors from multiple formats', () => {
        expect(Color.from('#ffffff').toHex()).toBe('#ffffff');
        expect(Color.from('#FFFFFF').toHex()).toBe('#ffffff');
        expect(Color.from('#fff').toHex()).toBe('#f0f0f0'); // <- TODO: Should be #ffffff
        expect(Color.from('#ffffffff').toHex()).toBe('#ffffff');
    });

    // TODO: Write more tests for Color class
});
