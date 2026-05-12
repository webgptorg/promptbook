import { describe, expect, it } from '@jest/globals';
import { AVATAR_VISUALS, getAvatarVisualById, resolveAvatarVisualId } from './avatarVisualRegistry';

describe('avatar visual registry', () => {
    it('should include the newer built-in visuals alongside the existing ones', () => {
        const visualIds = AVATAR_VISUALS.map((avatarVisual) => avatarVisual.id);

        expect(visualIds).toEqual(
            expect.arrayContaining([
                'pixel-art',
                'octopus',
                'octopus2',
                'octopus3',
                'ascii-octopus',
                'minecraft',
                'minecraft2',
                'fractal',
                'orb',
            ]),
        );
        expect(new Set(visualIds).size).toBe(AVATAR_VISUALS.length);
        expect(getAvatarVisualById('ascii-octopus').title).toBe('AsciiOctopus');
        expect(getAvatarVisualById('minecraft2').title).toBe('Minecraft 3D 2');
        expect(getAvatarVisualById('orb').title).toBe('Orb');
    });

    it('resolves avatar visual ids case-insensitively with normalized separators', () => {
        expect(resolveAvatarVisualId('PIXEL_ART')).toBe('pixel-art');
        expect(resolveAvatarVisualId('pixel art')).toBe('pixel-art');
        expect(resolveAvatarVisualId('pixel-art')).toBe('pixel-art');
        expect(resolveAvatarVisualId('ASCII_OCTOPUS')).toBe('ascii-octopus');
        expect(resolveAvatarVisualId('Octopus 3')).toBe('octopus3');
        expect(resolveAvatarVisualId('Minecraft 3D 2')).toBe('minecraft2');
        expect(resolveAvatarVisualId('unknown')).toBe(null);
    });
});
