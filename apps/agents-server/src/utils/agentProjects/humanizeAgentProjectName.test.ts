import { describe, expect, it } from '@jest/globals';
import { humanizeAgentProjectName } from './humanizeAgentProjectName';

describe('humanizeAgentProjectName', () => {
    it('turns project directory names into human-readable names', () => {
        expect(humanizeAgentProjectName('prague-murders-map')).toBe('Prague Murders Map');
        expect(humanizeAgentProjectName('my_first.project')).toBe('My First Project');
        expect(humanizeAgentProjectName('Website')).toBe('Website');
    });

    it('keeps names which cannot be humanized', () => {
        expect(humanizeAgentProjectName('---')).toBe('---');
        expect(humanizeAgentProjectName('')).toBe('');
    });
});
