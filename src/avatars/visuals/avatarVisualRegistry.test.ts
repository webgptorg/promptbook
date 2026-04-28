import { describe, expect, it } from '@jest/globals';
import { AVATAR_VISUALS, getAvatarVisualById, resolveAvatarVisualId } from './avatarVisualRegistry';

describe('avatar visual registry', () => {
    it('should include Orb alongside the existing built-in visuals', () => {
        const visualIds = AVATAR_VISUALS.map((avatarVisual) => avatarVisual.id);

        expect(visualIds).toEqual(
            expect.arrayContaining([
                'pixel-art',
                'octopus',
                'octopus2',
                'octopus3',
                'ascii-octopus',
                'minecraft',
                'fractal',
                'orb',
            ]),
        );
        expect(new Set(visualIds).size).toBe(AVATAR_VISUALS.length);
        expect(getAvatarVisualById('ascii-octopus').title).toBe('AsciiOctopus');
        expect(getAvatarVisualById('orb').title).toBe('Orb');
    });

    it('resolves avatar visual ids case-insensitively with normalized separators', () => {
        expect(resolveAvatarVisualId('PIXEL_ART')).toBe('pixel-art');
        expect(resolveAvatarVisualId('pixel art')).toBe('pixel-art');
        expect(resolveAvatarVisualId('pixel-art')).toBe('pixel-art');
        expect(resolveAvatarVisualId('ASCII_OCTOPUS')).toBe('ascii-octopus');
        expect(resolveAvatarVisualId('Octopus 3')).toBe('octopus3');
        expect(resolveAvatarVisualId('unknown')).toBe(null);
    });
});
