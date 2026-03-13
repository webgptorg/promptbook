import { describe, expect, it } from '@jest/globals';
import { createWordLikeDeltas } from './createWordLikeDeltas';

describe('createWordLikeDeltas', () => {
    it('reconstructs the original content while preserving whitespace', () => {
        expect(createWordLikeDeltas('Hello  world.\n\nNext line.').join('')).toBe('Hello  world.\n\nNext line.');
    });
});
