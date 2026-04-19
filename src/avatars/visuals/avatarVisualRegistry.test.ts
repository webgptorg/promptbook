import { describe, expect, it } from '@jest/globals';
import { AVATAR_VISUALS, getAvatarVisualById } from './avatarVisualRegistry';

describe('avatar visual registry', () => {
    it('should include Octopus2 alongside the existing built-in visuals', () => {
        const visualIds = AVATAR_VISUALS.map((avatarVisual) => avatarVisual.id);

        expect(visualIds).toEqual(expect.arrayContaining(['pixel-art', 'octopus', 'octopus2', 'minecraft']));
        expect(new Set(visualIds).size).toBe(AVATAR_VISUALS.length);
        expect(getAvatarVisualById('octopus2').title).toBe('Octopus2');
    });
});
