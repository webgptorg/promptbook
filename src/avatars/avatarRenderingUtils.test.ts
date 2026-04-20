import { describe, expect, it } from '@jest/globals';
import { createAvatarPalette } from './avatarRenderingUtils';

describe('createAvatarPalette', () => {
    it('keeps the avatar background transparent when the parent card owns the surface', () => {
        const palette = createAvatarPalette(
            {
                agentName: 'Assistant',
                agentHash: 'hash-1',
                colors: ['#ff3366'],
            },
            'transparent',
        );

        expect(palette.background).toBe('transparent');
        expect(palette.backgroundSecondary).toBe('transparent');
        expect(palette.primary).toBe('#ff3366');
    });
});
