import { describe, expect, it } from '@jest/globals';
import { parseAvatarPlaygroundState } from './avatarPlaygroundUrlState';

describe('avatar playground URL state', () => {
    it('should accept octopus2 as a supported built-in visual', () => {
        const avatarPlaygroundState = parseAvatarPlaygroundState(new URLSearchParams('visual=octopus2'));

        expect(avatarPlaygroundState.visualId).toBe('octopus2');
    });
});
