import { describe, expect, it } from '@jest/globals';
import { createExternalAgentRepositoryName } from './ensureExternalAgentRepository';

describe('ensureExternalAgentRepository', () => {
    it('creates runner repositories as agent-<AGENT_ID>', () => {
        expect(createExternalAgentRepositoryName('hks8wgs2xc5g')).toBe('agent-hks8wgs2xc5g');
    });

    it('normalizes the permanent id without adding the agent name', () => {
        expect(createExternalAgentRepositoryName(' Generic Chatter_HKS8WGS2XC5G ')).toBe(
            'agent-generic-chatter_hks8wgs2xc5g',
        );
    });
});
