import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { ActionCommitmentDefinition } from './ACTION';

describe.each(['ACTION', 'ACTIONS'] as const)('ActionCommitmentDefinition %s', (type: 'ACTION' | 'ACTIONS') => {
    it('marks the legacy capability commitment as deprecated while keeping runtime behavior', () => {
        const commitment = new ActionCommitmentDefinition(type);
        const requirements = createBasicAgentModelRequirements('test-agent');

        expect(commitment.type).toBe(type);
        expect(commitment.deprecation).toEqual({
            message: 'Use a concrete `USE*` commitment instead.',
        });
        expect(commitment.description).toContain('Deprecated legacy capability commitment');
        expect(commitment.documentation).toContain(`# ${type}`);
        expect(commitment.documentation).toContain('## Migration');
        expect(commitment.documentation).toContain('USE SEARCH ENGINE');

        const updatedRequirements = commitment.applyToAgentModelRequirements(
            requirements,
            'Can search for current information and summarize findings',
        );

        expect(updatedRequirements.systemMessage).toContain(
            'Capability: Can search for current information and summarize findings',
        );
    });

    it('ignores empty content', () => {
        const commitment = new ActionCommitmentDefinition(type);
        const requirements = createBasicAgentModelRequirements('test-agent');

        expect(commitment.applyToAgentModelRequirements(requirements, '')).toBe(requirements);
    });
});
