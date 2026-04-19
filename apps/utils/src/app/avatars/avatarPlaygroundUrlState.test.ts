import { describe, expect, it } from '@jest/globals';
import { parseAvatarPlaygroundState } from './avatarPlaygroundUrlState';

describe('avatar playground URL state', () => {
    it('should accept fractal as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=fractal'));

        expect(avatarPlaygroundState.visualId).toBe('fractal');
    });
});
