import { describe, expect, it } from '@jest/globals';
import { createAgentProjectInitials } from './createAgentProjectInitials';

describe('createAgentProjectInitials', () => {
    it('creates initials from the words of the project directory name', () => {
        expect(createAgentProjectInitials('prague-murders-map')).toBe('PMM');
        expect(createAgentProjectInitials('snake-game')).toBe('SG');
        expect(createAgentProjectInitials('website')).toBe('W');
    });

    it('shows at most three initials', () => {
        expect(createAgentProjectInitials('my-first-cool-project')).toBe('MFC');
    });

    it('skips the characters which are neither letters nor digits', () => {
        expect(createAgentProjectInitials('__3d-map')).toBe('3M');
        expect(createAgentProjectInitials('---')).toBe('#');
    });
});
