import { createAgentProjectInitials } from './createAgentProjectInitials';

describe('createAgentProjectInitials', () => {
    it('creates up to three initials from a project directory name', () => {
        expect(createAgentProjectInitials('prague-murders-map')).toBe('PMM');
        expect(createAgentProjectInitials('snake-game')).toBe('SG');
    });

    it('uses a question-mark fallback for a name without letters or numbers', () => {
        expect(createAgentProjectInitials('---')).toBe('?');
    });
});
