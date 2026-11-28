import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { MessageSuffixCommitmentDefinition } from './MESSAGE_SUFFIX';

describe('MESSAGE SUFFIX commitment', () => {
    it('should have correct metadata', () => {
        const commitment = new MessageSuffixCommitmentDefinition();

        expect(commitment.type).toBe('MESSAGE SUFFIX');
        expect(commitment.description).toBeTruthy();
        expect(commitment.icon).toBeTruthy();
        expect(commitment.documentation).toContain('# MESSAGE SUFFIX');
    });

    it('should not modify model requirements', () => {
        const commitment = new MessageSuffixCommitmentDefinition();
        const initialRequirements = createBasicAgentModelRequirements('Test Agent');

        const result = commitment.applyToAgentModelRequirements(initialRequirements, 'Sample suffix');

        expect(result).toEqual(initialRequirements);
    });
});
