import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { MetaDisclaimerCommitmentDefinition } from './META_DISCLAIMER';

describe('META DISCLAIMER commitment', () => {
    it('should have correct metadata', () => {
        const commitment = new MetaDisclaimerCommitmentDefinition();

        expect(commitment.type).toBe('META DISCLAIMER');
        expect(commitment.description).toBeTruthy();
        expect(commitment.icon).toBeTruthy();
        expect(commitment.documentation).toContain('# META DISCLAIMER');
    });

    it('should not modify model requirements', () => {
        const commitment = new MetaDisclaimerCommitmentDefinition();
        const initialRequirements = createBasicAgentModelRequirements('Test Agent');

        const result = commitment.applyToAgentModelRequirements(initialRequirements, 'Sample disclaimer');

        expect(result).toEqual(initialRequirements);
    });
});
