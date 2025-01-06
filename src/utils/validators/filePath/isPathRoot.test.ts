import { describe, expect, it } from '@jest/globals';
import { isPathRoot } from './isPathRoot';

describe('how `isPathRoot` works', () => {
    it('works with Linux paths', () => {
        expect(isPathRoot(`/`)).toBe(true);
        expect(isPathRoot(`/foo`)).toBe(false);
    });

    it('works with Windows paths', () => {
        expect(isPathRoot(`C:\\`)).toBe(true);
        expect(isPathRoot(`C:\\foo`)).toBe(false);
    });
});

/**
 * TODO: [🍏] Make for MacOS paths
 */
