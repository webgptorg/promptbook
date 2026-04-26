import { describe, expect, it } from '@jest/globals';
import { parseAvatarPlaygroundState } from './avatarPlaygroundUrlState';

describe('avatar playground URL state', () => {
    it('should accept ascii-octopus as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=ascii-octopus'));

        expect(avatarPlaygroundState.visualId).toBe('ascii-octopus');
    });

    it('should accept octopus3 as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=octopus3'));

        expect(avatarPlaygroundState.visualId).toBe('octopus3');
    });

    it('should accept fractal as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=fractal'));

        expect(avatarPlaygroundState.visualId).toBe('fractal');
    });

    it('should accept orb as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=orb'));

        expect(avatarPlaygroundState.visualId).toBe('orb');
    });
});
