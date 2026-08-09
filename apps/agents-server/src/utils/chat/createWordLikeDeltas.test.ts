import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { createWordLikeDeltas } from './createWordLikeDeltas';

describe('createWordLikeDeltas', () => {
    it('reconstructs the original content while preserving whitespace', () => {
        expect(createWordLikeDeltas(spaceTrim(`
            Hello  world.

            Next line.
        `)).join('')).toBe(spaceTrim(`
            Hello  world.

            Next line.
        `));
    });
});
