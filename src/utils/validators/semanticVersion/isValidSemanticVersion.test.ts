import { describe, expect, it } from '@jest/globals';
import { isValidSemanticVersion } from './isValidSemanticVersion';

describe('how isValidSemanticVersion works', () => {
    it('is valid semantic version', () => {
        expect(isValidSemanticVersion(`1.0.0`)).toBe(true);
        expect(isValidSemanticVersion(`1.0.0-5`)).toBe(true);
        // TODO: [🧠] What about just 'v1.0.0'
    });

    it('is NOT valid semantic version', () => {
        expect(isValidSemanticVersion(`59`)).toBe(false);
        expect(isValidSemanticVersion(`0.0.0`)).toBe(false);
        expect(isValidSemanticVersion(``)).toBe(false);
        expect(isValidSemanticVersion(`Invalid version`)).toBe(false);
        expect(isValidSemanticVersion(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidSemanticVersion(`wtf://`)).toBe(false);
    });
});
