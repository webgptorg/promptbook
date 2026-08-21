import { describe, expect, it } from '@jest/globals';
import { $generateBookBoilerplate } from './$generateBookBoilerplate';

describe('$generateBookBoilerplate', () => {
    it('creates new agent books with GOAL instead of deprecated PERSONA', () => {
        const agentSource = $generateBookBoilerplate({
            agentName: 'Practical Helper',
            personaDescription: 'Help users make practical decisions.',
            initialRules: ['Give concise next steps.'],
        });

        expect(agentSource).toContain('GOAL Help users make practical decisions.');
        expect(agentSource).toContain('RULE Give concise next steps.');
        expect(agentSource).not.toContain('PERSONA');
    });
});
