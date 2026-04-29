import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { DeleteCommitmentDefinition } from './DELETE';

describe.each(['DELETE', 'CANCEL', 'DISCARD', 'REMOVE'] as const)(
    'DeleteCommitmentDefinition %s',
    (type: 'DELETE' | 'CANCEL' | 'DISCARD' | 'REMOVE') => {
        it('marks the delete family as unfinished while keeping runtime behavior', () => {
            const commitment = new DeleteCommitmentDefinition(type);
            const requirements = createBasicAgentModelRequirements('test-agent');

            expect(commitment.type).toBe(type);
            expect(commitment.isUnfinished).toBe(true);
            expect(commitment.description).toMatch(/unfinished/i);
            expect(commitment.documentation).toContain('# DELETE (CANCEL, DISCARD, REMOVE)');
            expect(commitment.documentation).toContain('not ready to use');
            expect(commitment.documentation).toContain('use it carefully');

            const updatedRequirements = commitment.applyToAgentModelRequirements(
                requirements,
                'Remove conflicting formatting instructions',
            );

            expect(updatedRequirements.systemMessage).toContain(`${type}: Remove conflicting formatting instructions`);
        });

        it('ignores empty content', () => {
            const commitment = new DeleteCommitmentDefinition(type);
            const requirements = createBasicAgentModelRequirements('test-agent');

            expect(commitment.applyToAgentModelRequirements(requirements, '   ')).toBe(requirements);
        });
    },
);
