import { describe, expect, it } from '@jest/globals';
import { isValidPromptbookVersion } from './isValidPromptbookVersion';

describe('how isValidPromptbookVersion works', () => {
    it('is valid promptbook version', () => {
        expect(isValidPromptbookVersion(`0.62.0`)).toBe(true);
    });

    it('is valid semantic version BUT not promptbook version', () => {
        expect(isValidPromptbookVersion(`1.0.0`)).toBe(false); // <- Note: Kind of a internal joke which will be removed after 1.0.0 release
        expect(isValidPromptbookVersion(`2.0.0`)).toBe(false);
    });

    it('is NOT valid semantic version', () => {
        expect(isValidPromptbookVersion(`59`)).toBe(false);
        expect(isValidPromptbookVersion(`0.0.0`)).toBe(false);
        expect(isValidPromptbookVersion(``)).toBe(false);
        expect(isValidPromptbookVersion(`Invalid version`)).toBe(false);
        expect(isValidPromptbookVersion(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidPromptbookVersion(`wtf://`)).toBe(false);
    });
});
