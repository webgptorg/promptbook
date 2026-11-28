import { describe, expect, it } from '@jest/globals';
import { isValidJavascriptName } from './isValidJavascriptName';

describe('how isValidJavascriptName works', () => {
    it('is valid javascript name', () => {
        expect(isValidJavascriptName(`foo`)).toBe(true);
        expect(isValidJavascriptName(`bar`)).toBe(true);
        expect(isValidJavascriptName(`fooBar`)).toBe(true);
        // TODO: [🧠] What about just '$foo' or '_foo'
    });

    it('is NOT valid javascript name', () => {
        expect(isValidJavascriptName(``)).toBe(false);
        expect(isValidJavascriptName(`foo-bar`)).toBe(false);
        expect(isValidJavascriptName(`#`)).toBe(false);
        expect(isValidJavascriptName(`foo:bar`)).toBe(false);
        expect(isValidJavascriptName(`foo/bar`)).toBe(false);
    });
});
