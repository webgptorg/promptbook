import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { getCommitmentNoticeMetadata } from '../_common/getCommitmentNoticeMetadata';
import { ModelCommitmentDefinition } from './MODEL';

describe.each(['MODEL', 'MODELS'] as const)('ModelCommitmentDefinition %s', (type: 'MODEL' | 'MODELS') => {
    it('marks the model commitment as low-level while keeping runtime behavior', () => {
        const commitment = new ModelCommitmentDefinition(type);
        const requirements = createBasicAgentModelRequirements('test-agent');

        expect(commitment.type).toBe(type);
        expect(commitment.isLowLevel).toBe(true);
        expect(commitment.description).toContain('Low-level commitment');
        expect(commitment.documentation).toContain(`# ${type}`);
        expect(commitment.documentation).toContain('## Status');
        expect(commitment.documentation).toContain('not used by most of the users');
        expect(getCommitmentNoticeMetadata(commitment)).toEqual({
            kind: 'lowLevel',
            badgeLabel: 'Low-level',
            detailLabel: 'Low-level commitment',
            message: 'This commitment is low-level and not used by most of the users. Be careful when using it.',
        });

        const updatedRequirements = commitment.applyToAgentModelRequirements(requirements, 'NAME gpt-4');

        expect(updatedRequirements.modelName).toBe('gpt-4');
    });
});
